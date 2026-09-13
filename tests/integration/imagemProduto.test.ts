import request from 'supertest';
import app from '../../src/app';
import { Produto } from '../../src/models/Produto';
import {
    ArmazenamentoImagens,
    definirArmazenamentoImagens,
} from '../../src/services/armazenamentoImagens';
import { jpegFalso } from '../helpers/jpegFalso';
import { criarAdmin, criarCliente, criarProduto, tokenDe } from './helpers/fabricas';

const BASE = 'https://imagens.teste/';

// No lugar do R2: guarda em memoria e registra o que foi apagado.
class ArmazenamentoMemoria implements ArmazenamentoImagens {
    objetos = new Map<string, { conteudo: Buffer; tipo: string }>();
    apagados: string[] = [];
    falharEnvio = false;

    async enviar(chave: string, conteudo: Buffer, tipo: string) {
        if (this.falharEnvio) throw new Error('R2 fora do ar');
        this.objetos.set(chave, { conteudo, tipo });
    }
    async apagar(chave: string) {
        this.apagados.push(chave);
        this.objetos.delete(chave);
    }
    urlPublica(chave: string) {
        return `${BASE}${chave}`;
    }
    chaveDaUrl(url: string) {
        return url.startsWith(BASE) ? url.slice(BASE.length) : null;
    }
}

describe('Foto do produto (com banco)', () => {
    let armazenamento: ArmazenamentoMemoria;
    let token: string;

    beforeEach(async () => {
        armazenamento = new ArmazenamentoMemoria();
        definirArmazenamentoImagens(armazenamento);
        token = tokenDe(await criarAdmin());
    });

    afterAll(() => definirArmazenamentoImagens(undefined as unknown as null));

    function enviar(produtoId: number, grande = jpegFalso(800, 800, 2000), miniatura = jpegFalso(160, 160, 300)) {
        return request(app)
            .put(`/produtos/${produtoId}/imagem`)
            .set('Authorization', `Bearer ${token}`)
            .attach('grande', grande, 'grande.jpg')
            .attach('miniatura', miniatura, 'miniatura.jpg');
    }

    it('grava os dois tamanhos e aponta o produto para eles', async () => {
        const produto = await criarProduto();
        const grande = jpegFalso(800, 800, 2000);

        const res = await enviar(produto.id, grande);

        expect(res.status).toBe(200);
        expect(res.body.imagemUrl).toMatch(new RegExp(`^${BASE}produtos/${produto.id}/[0-9a-f]{12}-800\\.jpg$`));
        expect(res.body.imagemMiniaturaUrl).toMatch(new RegExp(`^${BASE}produtos/${produto.id}/[0-9a-f]{12}-160\\.jpg$`));

        const chaveGrande = armazenamento.chaveDaUrl(res.body.imagemUrl)!;
        expect(armazenamento.objetos.get(chaveGrande)).toEqual({ conteudo: grande, tipo: 'image/jpeg' });
        expect(armazenamento.objetos.size).toBe(2);

        const noBanco = await Produto.findByPk(produto.id);
        expect(noBanco?.imagemUrl).toBe(res.body.imagemUrl);
    });

    // Trocar a foto nao pode deixar a antiga ocupando o bucket para sempre.
    it('trocar a foto apaga os arquivos da anterior', async () => {
        const produto = await criarProduto();
        const primeira = await enviar(produto.id);
        const segunda = await enviar(produto.id);

        expect(segunda.status).toBe(200);
        expect(segunda.body.imagemUrl).not.toBe(primeira.body.imagemUrl);
        expect(armazenamento.objetos.size).toBe(2);
        expect(armazenamento.apagados.sort()).toEqual(
            [armazenamento.chaveDaUrl(primeira.body.imagemUrl), armazenamento.chaveDaUrl(primeira.body.imagemMiniaturaUrl)].sort(),
        );
    });

    it('URL externa digitada a mao nao e apagada de lugar nenhum', async () => {
        const produto = await criarProduto({ imagemUrl: 'https://cdn.externo.com/cerveja.jpg' });

        const res = await enviar(produto.id);

        expect(res.status).toBe(200);
        expect(armazenamento.apagados).toEqual([]);
    });

    it.each([
        ['nao e JPEG', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]), jpegFalso(160, 160), /JPEG/],
        ['nao e quadrada', jpegFalso(800, 600), jpegFalso(160, 160), /quadrada/],
        ['e pequena demais', jpegFalso(300, 300), jpegFalso(160, 160), /entre 400 e 1200/],
        ['a miniatura e grande demais', jpegFalso(800, 800), jpegFalso(800, 800), /miniatura precisa ter entre/],
    ])('recusa com 422 quando a foto %s, sem gravar nada', async (_caso, grande, miniatura, mensagem) => {
        const produto = await criarProduto();

        const res = await enviar(produto.id, grande, miniatura);

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(mensagem);
        expect(armazenamento.objetos.size).toBe(0);
        expect((await Produto.findByPk(produto.id))?.imagemUrl).toBeNull();
    });

    it('recusa com 422 quando falta a miniatura', async () => {
        const produto = await criarProduto();

        const res = await request(app)
            .put(`/produtos/${produto.id}/imagem`)
            .set('Authorization', `Bearer ${token}`)
            .attach('grande', jpegFalso(800, 800), 'grande.jpg');

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/miniatura não foi enviada/);
    });

    it('recusa com 422 um terceiro arquivo no envio', async () => {
        const produto = await criarProduto();

        const res = await enviar(produto.id).attach('outra', jpegFalso(800, 800), 'outra.jpg');

        expect(res.status).toBe(422);
        expect(armazenamento.objetos.size).toBe(0);
    });

    it('404 para produto que nao existe', async () => {
        const res = await enviar(999999);
        expect(res.status).toBe(404);
    });

    it('403 para cliente', async () => {
        const produto = await criarProduto();
        token = tokenDe(await criarCliente());

        const res = await enviar(produto.id);

        expect(res.status).toBe(403);
        expect(armazenamento.objetos.size).toBe(0);
    });

    it('503 quando o armazenamento nao esta configurado', async () => {
        definirArmazenamentoImagens(null);
        const produto = await criarProduto();

        const res = await enviar(produto.id);

        expect(res.status).toBe(503);
    });

    it('502 quando o R2 falha, e o produto continua como estava', async () => {
        const produto = await criarProduto({ imagemUrl: 'https://cdn.externo.com/antiga.jpg' });
        armazenamento.falharEnvio = true;

        const res = await enviar(produto.id);

        expect(res.status).toBe(502);
        expect((await Produto.findByPk(produto.id))?.imagemUrl).toBe('https://cdn.externo.com/antiga.jpg');
    });

    it('remover a foto limpa o produto e apaga os arquivos', async () => {
        const produto = await criarProduto();
        await enviar(produto.id);

        const res = await request(app)
            .delete(`/produtos/${produto.id}/imagem`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.imagemUrl).toBeNull();
        expect(res.body.imagemMiniaturaUrl).toBeNull();
        expect(armazenamento.objetos.size).toBe(0);
    });

    it('trocar a URL a mao no cadastro tira a miniatura da foto anterior', async () => {
        const produto = await criarProduto();
        const comFoto = await enviar(produto.id);

        const res = await request(app)
            .put(`/produtos/${produto.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ imagemUrl: 'https://cdn.externo.com/nova.jpg' });

        expect(res.status).toBe(200);
        expect(res.body.imagemUrl).toBe('https://cdn.externo.com/nova.jpg');
        expect(res.body.imagemMiniaturaUrl).toBeNull();
        expect(armazenamento.apagados).toContain(armazenamento.chaveDaUrl(comFoto.body.imagemUrl));
    });

    it('editar outro campo nao mexe na foto', async () => {
        const produto = await criarProduto();
        const comFoto = await enviar(produto.id);

        const res = await request(app)
            .put(`/produtos/${produto.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ preco: 9.9 });

        expect(res.body.imagemMiniaturaUrl).toBe(comFoto.body.imagemMiniaturaUrl);
        expect(armazenamento.apagados).toEqual([]);
    });

    it('excluir o produto apaga os arquivos da foto', async () => {
        const produto = await criarProduto();
        await enviar(produto.id);

        const res = await request(app).delete(`/produtos/${produto.id}`).set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(204);
        expect(armazenamento.objetos.size).toBe(0);
    });

    it('a listagem filtra os produtos sem foto', async () => {
        const comFoto = await criarProduto({ nome: 'Com foto' });
        await enviar(comFoto.id);
        await criarProduto({ nome: 'Sem foto' });
        await criarProduto({ nome: 'Foto vazia', imagemUrl: '' });

        const res = await request(app).get('/produtos?semImagem=true');

        expect(res.body.data.map((p: Produto) => p.nome).sort()).toEqual(['Foto vazia', 'Sem foto']);
    });
});
