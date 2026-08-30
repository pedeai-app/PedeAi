import request from 'supertest';
import app from '../../src/app';
import { Pedido } from '../../src/models/Pedido';
import { Produto } from '../../src/models/Produto';
import {
    criarAdmin,
    criarCarrinhoCom,
    criarCliente,
    criarProduto,
    tokenDe,
} from './helpers/fabricas';

describe('Pedidos (com banco)', () => {

    it('grava nome e endereco de entrega no fechamento', async () => {
        const cliente = await criarCliente({ nome: 'Ana Compradora', endereco: 'Rua A, 100' });
        const produto = await criarProduto({ preco: 10 });
        await criarCarrinhoCom(cliente, produto, 2);

        const res = await request(app)
            .post('/pedidos/finalizar')
            .set('Authorization', `Bearer ${tokenDe(cliente)}`)
            .send({});

        expect(res.status).toBe(201);
        expect(res.body.nomeCliente).toBe('Ana Compradora');
        expect(res.body.enderecoEntrega).toBe('Rua A, 100');
    });

    // E a razao de o snapshot existir: antes dele o endereco vinha de um join ao
    // vivo, e mudar o cadastro reescrevia o destino de pedidos ja entregues.
    it('preserva o endereco do pedido quando o cliente se muda depois', async () => {
        const cliente = await criarCliente({ endereco: 'Rua Antiga, 1' });
        const admin = await criarAdmin();
        const produto = await criarProduto();
        await criarCarrinhoCom(cliente, produto);

        const criado = await request(app)
            .post('/pedidos/finalizar')
            .set('Authorization', `Bearer ${tokenDe(cliente)}`)
            .send({});

        await cliente.update({ endereco: 'Avenida Nova, 999' });

        const detalhe = await request(app)
            .get(`/pedidos/${criado.body.id}`)
            .set('Authorization', `Bearer ${tokenDe(admin)}`);

        expect(detalhe.status).toBe(200);
        expect(detalhe.body.enderecoEntrega).toBe('Rua Antiga, 1');
        // O contato segue sendo o atual: telefone e para ligar hoje, nao registro.
        expect(detalhe.body.cliente.endereco).toBeUndefined();
    });

    it('guarda o cpf da nota no pedido, sem tocar no cadastro do cliente', async () => {
        const cliente = await criarCliente({ cpf: null });
        const produto = await criarProduto();
        await criarCarrinhoCom(cliente, produto);

        const res = await request(app)
            .post('/pedidos/finalizar')
            .set('Authorization', `Bearer ${tokenDe(cliente)}`)
            .send({ cpfNota: '11122233344' });

        expect(res.status).toBe(201);
        expect(res.body.cpfNota).toBe('11122233344');

        await cliente.reload();
        expect(cliente.cpf).toBeNull();
    });

    it('baixa o estoque do produto ao fechar o pedido', async () => {
        const cliente = await criarCliente();
        const produto = await criarProduto({ estoque: 5 });
        await criarCarrinhoCom(cliente, produto, 3);

        await request(app)
            .post('/pedidos/finalizar')
            .set('Authorization', `Bearer ${tokenDe(cliente)}`)
            .send({});

        await produto.reload();
        expect(produto.estoque).toBe(2);
    });

    it('recusa o pedido e nao mexe no estoque quando falta produto', async () => {
        const cliente = await criarCliente();
        const produto = await criarProduto({ estoque: 1 });
        await criarCarrinhoCom(cliente, produto, 5);

        const res = await request(app)
            .post('/pedidos/finalizar')
            .set('Authorization', `Bearer ${tokenDe(cliente)}`)
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Estoque insuficiente/);

        await produto.reload();
        expect(produto.estoque).toBe(1);
        expect(await Pedido.count()).toBe(0);
    });

    it('devolve cliente e produto na listagem do admin', async () => {
        const cliente = await criarCliente({ nome: 'Bruno Cliente' });
        const admin = await criarAdmin();
        const produto = await criarProduto({ nome: 'Cerveja Puro Malte' });
        await criarCarrinhoCom(cliente, produto);

        await request(app)
            .post('/pedidos/finalizar')
            .set('Authorization', `Bearer ${tokenDe(cliente)}`)
            .send({});

        const lista = await request(app)
            .get('/pedidos')
            .set('Authorization', `Bearer ${tokenDe(admin)}`);

        expect(lista.status).toBe(200);
        expect(lista.body.data).toHaveLength(1);
        expect(lista.body.data[0].cliente.nome).toBe('Bruno Cliente');
        expect(lista.body.data[0].itens[0].produto.nome).toBe('Cerveja Puro Malte');
        // CPF nunca aparece em resposta de pedido.
        expect(lista.body.data[0].cliente.cpf).toBeUndefined();
    });

    it('filtra a listagem por status', async () => {
        const cliente = await criarCliente();
        const admin = await criarAdmin();
        const produto = await criarProduto({ estoque: 50 });
        await criarCarrinhoCom(cliente, produto);

        await request(app)
            .post('/pedidos/finalizar')
            .set('Authorization', `Bearer ${tokenDe(cliente)}`)
            .send({});

        const pendentes = await request(app)
            .get('/pedidos?status=PENDENTE')
            .set('Authorization', `Bearer ${tokenDe(admin)}`);
        const entregues = await request(app)
            .get('/pedidos?status=ENTREGUE')
            .set('Authorization', `Bearer ${tokenDe(admin)}`);

        expect(pendentes.body.pagination.total).toBe(1);
        expect(entregues.body.pagination.total).toBe(0);
    });

    it('nao deixa um cliente ver o pedido de outro pela rota de admin', async () => {
        const dono = await criarCliente();
        const intruso = await criarCliente();
        const produto = await criarProduto();
        await criarCarrinhoCom(dono, produto);

        const criado = await request(app)
            .post('/pedidos/finalizar')
            .set('Authorization', `Bearer ${tokenDe(dono)}`)
            .send({});

        const res = await request(app)
            .get(`/pedidos/${criado.body.id}`)
            .set('Authorization', `Bearer ${tokenDe(intruso)}`);

        expect(res.status).toBe(403);
    });

    it('escopa meus-pedidos pelo dono do token, ignorando o de outros', async () => {
        const ana = await criarCliente();
        const bruno = await criarCliente();
        const produto = await criarProduto({ estoque: 50 });

        await criarCarrinhoCom(ana, produto);
        await request(app)
            .post('/pedidos/finalizar')
            .set('Authorization', `Bearer ${tokenDe(ana)}`)
            .send({});

        await criarCarrinhoCom(bruno, produto);
        await request(app)
            .post('/pedidos/finalizar')
            .set('Authorization', `Bearer ${tokenDe(bruno)}`)
            .send({});

        const res = await request(app)
            .get('/pedidos/meus-pedidos')
            .set('Authorization', `Bearer ${tokenDe(ana)}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].clienteId).toBe(ana.id);
    });
});

describe('Produtos (com banco)', () => {

    it('nao aceita campo fora do allowlist na criacao', async () => {
        const admin = await criarAdmin();

        const res = await request(app)
            .post('/produtos')
            .set('Authorization', `Bearer ${tokenDe(admin)}`)
            .send({ nome: 'Produto X', preco: '10.00', estoque: 1, id: 999 });

        expect(res.status).toBe(201);
        // O id veio no corpo mas foi ignorado: mass assignment barrado.
        expect(res.body.id).not.toBe(999);
        expect(await Produto.count()).toBe(1);
    });
});
