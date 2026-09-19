import request from 'supertest';
import app from '../../src/app';
import { Category } from '../../src/models/Category';
import { Order } from '../../src/models/Order';
import { Product } from '../../src/models/Product';
import { createCartWith, createCustomer, createProduct, tokenFor } from './helpers/factories';

// O admin tem dois interruptores que prometem "visivel no catalogo" — no produto
// e na categoria — e ate aqui nenhum tinha efeito para o cliente: o catalogo
// listava inativo, o carrinho aceitava e o pedido fechava.
describe('Produto indisponivel fica fora da venda (com banco)', () => {

    const idsDe = (res: request.Response) => res.body.data.map((p: Product) => p.id).sort();

    it('o catalogo do cliente so traz o que pode ser vendido', async () => {
        const ativa = await Category.create({ nome: 'Cervejas', ativo: true });
        const inativa = await Category.create({ nome: 'Doses', ativo: false });

        const vendavel = await createProduct({ categoriaId: ativa.id });
        const semCategoria = await createProduct({ categoriaId: null as unknown as number });
        await createProduct({ categoriaId: ativa.id, ativo: false });
        await createProduct({ categoriaId: inativa.id });

        const res = await request(app).get('/produtos?disponivel=true');

        expect(res.status).toBe(200);
        // Sem categoria conta como disponivel: categoria e opcional no cadastro.
        expect(idsDe(res)).toEqual([vendavel.id, semCategoria.id].sort());
        expect(res.body.pagination.total).toBe(2);
    });

    // O admin lista pelo mesmo endpoint e precisa ver os inativos, senao nao
    // consegue reativar nada.
    it('sem o parametro, a listagem continua trazendo tudo', async () => {
        await createProduct({ ativo: true });
        await createProduct({ ativo: false });

        const res = await request(app).get('/produtos');

        expect(res.body.pagination.total).toBe(2);
    });

    // A disponibilidade e a busca usam, as duas, um [Op.or]. Montadas com
    // Object.assign, a segunda sobrescreveria a primeira e a busca pararia de
    // filtrar sem erro nenhum.
    it('combina a disponibilidade com a busca sem uma apagar a outra', async () => {
        await createProduct({ nome: 'Heineken 600ml' });
        await createProduct({ nome: 'Heineken Zero', ativo: false });
        await createProduct({ nome: 'Coca-Cola 2L' });

        const res = await request(app).get('/produtos?disponivel=true&q=heineken');

        expect(res.body.data.map((p: Product) => p.nome)).toEqual(['Heineken 600ml']);
    });

    it('o carrinho recusa produto inativo', async () => {
        const customer = await createCustomer();
        const product = await createProduct({ ativo: false });

        const res = await request(app)
            .post('/carrinho/adicionar')
            .set('Authorization', `Bearer ${tokenFor(customer)}`)
            .send({ produtoId: product.id, quantidade: 1 });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/não está disponível/);
    });

    it('o carrinho recusa produto ativo de categoria desativada', async () => {
        const customer = await createCustomer();
        const inativa = await Category.create({ nome: 'Tabacaria', ativo: false });
        const product = await createProduct({ categoriaId: inativa.id, ativo: true });

        const res = await request(app)
            .post('/carrinho/adicionar')
            .set('Authorization', `Bearer ${tokenFor(customer)}`)
            .send({ produtoId: product.id, quantidade: 1 });

        expect(res.status).toBe(400);
    });

    // O caso que so o fechamento pega: o item entrou no carrinho enquanto estava a
    // venda e foi desativado depois. Tambem e o teste que quebraria se a categoria
    // fosse buscada num include junto do FOR UPDATE — o Postgres recusa.
    it('o pedido nao fecha com item desativado depois de ir para o carrinho', async () => {
        const customer = await createCustomer();
        const category = await Category.create({ nome: 'Destilados', ativo: true });
        const product = await createProduct({ nome: 'Dose 51', categoriaId: category.id, estoque: 5 });
        await createCartWith(customer, product, 2);

        await category.update({ ativo: false });

        const res = await request(app)
            .post('/pedidos/finalizar')
            .set('Authorization', `Bearer ${tokenFor(customer)}`)
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('"Dose 51" não está mais disponível');

        // A transacao desfaz tudo: nem pedido criado, nem estoque baixado.
        expect(await Order.count()).toBe(0);
        await product.reload();
        expect(product.estoque).toBe(5);
    });

    it('o pedido fecha normalmente com produto disponivel e categoria ativa', async () => {
        const customer = await createCustomer();
        const category = await Category.create({ nome: 'Refrigerantes', ativo: true });
        const product = await createProduct({ categoriaId: category.id, estoque: 5 });
        await createCartWith(customer, product, 2);

        const res = await request(app)
            .post('/pedidos/finalizar')
            .set('Authorization', `Bearer ${tokenFor(customer)}`)
            .send({});

        expect(res.status).toBe(201);
        await product.reload();
        expect(product.estoque).toBe(3);
    });

    it('o detalhe traz a categoria, para a tela saber se da para comprar', async () => {
        const category = await Category.create({ nome: 'Doses', ativo: false });
        const product = await createProduct({ categoriaId: category.id });

        const res = await request(app).get(`/produtos/${product.id}`);

        expect(res.status).toBe(200);
        expect(res.body.categoria).toMatchObject({ nome: 'Doses', ativo: false });
    });
});
