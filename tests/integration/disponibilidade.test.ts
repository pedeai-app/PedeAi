import request from 'supertest';
import app from '../../src/app';
import { Categoria } from '../../src/models/Categoria';
import { Pedido } from '../../src/models/Pedido';
import { Produto } from '../../src/models/Produto';
import { criarCarrinhoCom, criarCliente, criarProduto, tokenDe } from './helpers/fabricas';

// O admin tem dois interruptores que prometem "visivel no catalogo" — no produto
// e na categoria — e ate aqui nenhum tinha efeito para o cliente: o catalogo
// listava inativo, o carrinho aceitava e o pedido fechava.
describe('Produto indisponivel fica fora da venda (com banco)', () => {

    const idsDe = (res: request.Response) => res.body.data.map((p: Produto) => p.id).sort();

    it('o catalogo do cliente so traz o que pode ser vendido', async () => {
        const ativa = await Categoria.create({ nome: 'Cervejas', ativo: true });
        const inativa = await Categoria.create({ nome: 'Doses', ativo: false });

        const vendavel = await criarProduto({ categoriaId: ativa.id });
        const semCategoria = await criarProduto({ categoriaId: null as unknown as number });
        await criarProduto({ categoriaId: ativa.id, ativo: false });
        await criarProduto({ categoriaId: inativa.id });

        const res = await request(app).get('/produtos?disponivel=true');

        expect(res.status).toBe(200);
        // Sem categoria conta como disponivel: categoria e opcional no cadastro.
        expect(idsDe(res)).toEqual([vendavel.id, semCategoria.id].sort());
        expect(res.body.pagination.total).toBe(2);
    });

    // O admin lista pelo mesmo endpoint e precisa ver os inativos, senao nao
    // consegue reativar nada.
    it('sem o parametro, a listagem continua trazendo tudo', async () => {
        await criarProduto({ ativo: true });
        await criarProduto({ ativo: false });

        const res = await request(app).get('/produtos');

        expect(res.body.pagination.total).toBe(2);
    });

    // A disponibilidade e a busca usam, as duas, um [Op.or]. Montadas com
    // Object.assign, a segunda sobrescreveria a primeira e a busca pararia de
    // filtrar sem erro nenhum.
    it('combina a disponibilidade com a busca sem uma apagar a outra', async () => {
        await criarProduto({ nome: 'Heineken 600ml' });
        await criarProduto({ nome: 'Heineken Zero', ativo: false });
        await criarProduto({ nome: 'Coca-Cola 2L' });

        const res = await request(app).get('/produtos?disponivel=true&q=heineken');

        expect(res.body.data.map((p: Produto) => p.nome)).toEqual(['Heineken 600ml']);
    });

    it('o carrinho recusa produto inativo', async () => {
        const cliente = await criarCliente();
        const produto = await criarProduto({ ativo: false });

        const res = await request(app)
            .post('/carrinho/adicionar')
            .set('Authorization', `Bearer ${tokenDe(cliente)}`)
            .send({ produtoId: produto.id, quantidade: 1 });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/não está disponível/);
    });

    it('o carrinho recusa produto ativo de categoria desativada', async () => {
        const cliente = await criarCliente();
        const inativa = await Categoria.create({ nome: 'Tabacaria', ativo: false });
        const produto = await criarProduto({ categoriaId: inativa.id, ativo: true });

        const res = await request(app)
            .post('/carrinho/adicionar')
            .set('Authorization', `Bearer ${tokenDe(cliente)}`)
            .send({ produtoId: produto.id, quantidade: 1 });

        expect(res.status).toBe(400);
    });

    // O caso que so o fechamento pega: o item entrou no carrinho enquanto estava a
    // venda e foi desativado depois. Tambem e o teste que quebraria se a categoria
    // fosse buscada num include junto do FOR UPDATE — o Postgres recusa.
    it('o pedido nao fecha com item desativado depois de ir para o carrinho', async () => {
        const cliente = await criarCliente();
        const categoria = await Categoria.create({ nome: 'Destilados', ativo: true });
        const produto = await criarProduto({ nome: 'Dose 51', categoriaId: categoria.id, estoque: 5 });
        await criarCarrinhoCom(cliente, produto, 2);

        await categoria.update({ ativo: false });

        const res = await request(app)
            .post('/pedidos/finalizar')
            .set('Authorization', `Bearer ${tokenDe(cliente)}`)
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('"Dose 51" não está mais disponível');

        // A transacao desfaz tudo: nem pedido criado, nem estoque baixado.
        expect(await Pedido.count()).toBe(0);
        await produto.reload();
        expect(produto.estoque).toBe(5);
    });

    it('o pedido fecha normalmente com produto disponivel e categoria ativa', async () => {
        const cliente = await criarCliente();
        const categoria = await Categoria.create({ nome: 'Refrigerantes', ativo: true });
        const produto = await criarProduto({ categoriaId: categoria.id, estoque: 5 });
        await criarCarrinhoCom(cliente, produto, 2);

        const res = await request(app)
            .post('/pedidos/finalizar')
            .set('Authorization', `Bearer ${tokenDe(cliente)}`)
            .send({});

        expect(res.status).toBe(201);
        await produto.reload();
        expect(produto.estoque).toBe(3);
    });

    it('o detalhe traz a categoria, para a tela saber se da para comprar', async () => {
        const categoria = await Categoria.create({ nome: 'Doses', ativo: false });
        const produto = await criarProduto({ categoriaId: categoria.id });

        const res = await request(app).get(`/produtos/${produto.id}`);

        expect(res.status).toBe(200);
        expect(res.body.categoria).toMatchObject({ nome: 'Doses', ativo: false });
    });
});
