import { Product } from '../../src/models/Product';
import { Category } from '../../src/models/Category';
import { readPdvCsv } from '../../src/import/pdvCsv';
import { readableName, brNumber } from '../../src/import/normalization';
import productImportService from '../../src/services/productImportService';

const CABECALHO =
    'Código;Nome;Código de Barras;Categoria;Código do Produto;Valor de Custo;Valor de Venda;Estoque;Tipo;Pesável;Composição';

// O PDV exporta em ISO-8859-1. Montar o CSV em latin1 e o que faz os testes
// exercitarem a decodificacao de verdade, e nao um UTF-8 que nunca chega.
function csv(...lines: string[]): Buffer {
    return Buffer.from([CABECALHO, ...lines].join('\r\n'), 'latin1');
}

const importProducts = (buffer: Buffer, dryRun = false) =>
    productImportService.importProducts(readPdvCsv(buffer), { dryRun });

describe('Normalizacao do PDV', () => {

    it('le numero no formato brasileiro', () => {
        expect(brNumber('1,52')).toBe(1.52);
        expect(brNumber('1.234,56')).toBe(1234.56);
        expect(brNumber('-5,00')).toBe(-5);
        expect(brNumber('')).toBeNull();
        expect(brNumber('abc')).toBeNull();
    });

    it('torna o nome legivel sem estragar unidades', () => {
        expect(readableName('CERVEJA ORIGINAL 600ML')).toBe('Cerveja Original 600ml');
        expect(readableName('AGUA DE COCO KERO COCO 1 LITRO')).toBe('Agua de Coco Kero Coco 1 Litro');
        expect(readableName('CERVEJA 2LITROS')).toBe('Cerveja 2L');
        expect(readableName('SUCO 300 ML')).toBe('Suco 300 ml');
        expect(readableName('AGUA CRISTAL 1,5')).toBe('Agua Cristal 1,5');
        expect(readableName('ÁGUA COM GÁS')).toBe('Água com Gás');
        expect(readableName('CART.PAP 1KG C/100')).toBe('Cart.Pap 1kg C/100');
        expect(readableName('COCA-COLA 10.000')).toBe('Coca-Cola 10.000');
    });

    // "Daniel'S" e o erro classico de capitalizar depois do apostrofo. E o PDV
    // grava o mesmo whisky ora com "'", ora com "´".
    it('trata apostrofo e sigla com &', () => {
        expect(readableName("JACK DANIEL'S")).toBe("Jack Daniel's");
        expect(readableName('JACK DANIEL´S')).toBe("Jack Daniel's");
        expect(readableName('M&M´S')).toBe("M&M's");
    });
});

describe('Importacao de produtos do PDV (com banco)', () => {

    it('cria produtos e categorias, e descarta o que nao e produto', async () => {
        const r = await importProducts(csv(
            '2;DIPLOKO MORANGO;7898934595463;DIPLOKO;2;1,52;3,00;81,00;00;Não;Não',
            '258;20 DINHEIRO;SEM GTIN;SAQUE;258;20,00;20,00;7,00;00;Não;Não',
            '635;7898915949322;SEM GTIN;CERVEJA;635;4,73;5,91;12,00;00;Não;Não',
            '371;AGUA COM GÁS 2 LITROS;SEM GTIN;ÁGUA;371;4,13;6,50;7,00;00;Não;Não',
        ));

        expect(r.created).toBe(2);
        expect(r.discarded.map((d) => d.code).sort()).toEqual(['258', '635']);
        expect(r.createdCategories.sort()).toEqual(['Drinks prontos', 'Águas']);

        const agua = await Product.findOne({ where: { pdvCode: '371' }, include: [Category] });
        expect(agua?.name).toBe('Agua com Gás 2 Litros');
        expect(Number(agua?.price)).toBe(6.5);
        expect(agua?.category?.name).toBe('Águas');
    });

    // A exportacao traz custo e venda lado a lado. Ler a coluna errada seria
    // vender tudo a preco de custo, sem erro nenhum aparecer.
    it('le o valor de venda pelo nome da coluna, nao pela posicao', async () => {
        const invertido = Buffer.from([
            'Valor de Venda;Estoque;Nome;Categoria;Valor de Custo;Código',
            '9,90;10,00;SALGADINHO;SALGADINHO;4,00;900',
        ].join('\r\n'), 'latin1');

        await importProducts(invertido);
        const product = await Product.findOne({ where: { pdvCode: '900' } });
        expect(Number(product?.price)).toBe(9.9);
    });

    it('zera estoque negativo e arredonda o fracionado para baixo', async () => {
        const r = await importProducts(csv(
            '10;PEPSI 2 LITROS;SEM GTIN;REFRIGERANTE;10;5,00;8,00;-3,00;00;Não;Não',
            '11;AGUARDENTE 51;SEM GTIN;AGUARDENTE;11;9,00;15,00;60,50;00;Não;Não',
        ));

        expect(r.adjusted).toHaveLength(2);
        expect((await Product.findOne({ where: { pdvCode: '10' } }))?.stock).toBe(0);
        expect((await Product.findOne({ where: { pdvCode: '11' } }))?.stock).toBe(60);
        expect(r.outOfStock).toBe(1);
    });

    it('cria doses inativas, porque dose nao se entrega', async () => {
        const r = await importProducts(csv('20;DOSE WHISKY;SEM GTIN;DOSE BEBIDAS;20;3,00;10,00;5,00;00;Não;Não'));

        expect(r.createdInactive).toBe(1);
        expect((await Product.findOne({ where: { pdvCode: '20' } }))?.active).toBe(false);
    });

    it('nao inventa categoria: sem mapeamento, descarta e avisa', async () => {
        const r = await importProducts(csv('30;COISA NOVA;SEM GTIN;CATEGORIA INEXISTENTE;30;1,00;2,00;1,00;00;Não;Não'));

        expect(r.created).toBe(0);
        expect(r.discarded[0].reason).toMatch(/sem mapeamento/);
    });

    it('rejeita linha com colunas a mais em vez de parti-la no lugar errado', async () => {
        const r = await importProducts(csv('40;NOME;COM;PONTO;E VIRGULA;SEM GTIN;CERVEJA;40;1,00;2,00;1,00;00;Não;Não'));

        expect(r.created).toBe(0);
        expect(r.discarded[0].reason).toMatch(/colunas/);
    });

    // A razao de existir o codigoPdv. Na segunda exportacao o PDV manda de novo o
    // produto inteiro; o que o admin mudou a mao nao pode voltar ao que era.
    it('na reimportacao atualiza so preco e estoque, e preserva o que o admin editou', async () => {
        await importProducts(csv('50;CERVEJA ORIGINAL 600ML;SEM GTIN;CERVEJA;50;5,00;12,90;10,00;00;Não;Não'));

        const product = await Product.findOne({ where: { pdvCode: '50' } });
        await product!.update({ name: 'Original 600 ml (garrafa)', active: false, imageUrl: 'https://cdn/x.png' });

        const r = await importProducts(csv('50;CERVEJA ORIGINAL 600ML;SEM GTIN;CERVEJA;50;5,00;13,50;4,00;00;Não;Não'));

        expect(r.created).toBe(0);
        expect(r.updated).toBe(1);
        await product!.reload();
        expect(Number(product!.price)).toBe(13.5);
        expect(product!.stock).toBe(4);
        expect(product!.name).toBe('Original 600 ml (garrafa)');
        expect(product!.active).toBe(false);
        expect(product!.imageUrl).toBe('https://cdn/x.png');
        expect(await Product.count()).toBe(1);
    });

    it('nao conta como atualizado o que nao mudou', async () => {
        const line = '60;GELO 3KG;SEM GTIN;GELO;60;5,00;14,00;7,00;00;Não;Não';
        await importProducts(csv(line));

        const r = await importProducts(csv(line));
        expect(r.unchanged).toBe(1);
        expect(r.updated).toBe(0);
    });

    it('simulando, mostra os numeros reais e nao grava nada', async () => {
        const r = await importProducts(csv('70;SUCO 300 ML;SEM GTIN;SUCO;70;2,00;5,00;3,00;00;Não;Não'), true);

        expect(r.dryRun).toBe(true);
        expect(r.created).toBe(1);
        expect(r.createdCategories).toEqual(['Sucos']);
        expect(await Product.count()).toBe(0);
        expect(await Category.count()).toBe(0);
    });
});
