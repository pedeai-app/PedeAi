import request from 'supertest';
import app from '../../src/app';
import { Order } from '../../src/models/Order';
import { Product } from '../../src/models/Product';
import {
    createAdmin,
    createCartWith,
    createCustomer,
    createProduct,
    tokenFor,
} from './helpers/factories';

describe('Pedidos (com banco)', () => {

    it('grava nome e endereco de entrega no fechamento', async () => {
        const customer = await createCustomer({ name: 'Ana Compradora', address: 'Rua A, 100' });
        const product = await createProduct({ price: 10 });
        await createCartWith(customer, product, 2);

        const res = await request(app)
            .post('/orders/checkout')
            .set('Authorization', `Bearer ${tokenFor(customer)}`)
            .send({});

        expect(res.status).toBe(201);
        expect(res.body.customerName).toBe('Ana Compradora');
        expect(res.body.deliveryAddress).toBe('Rua A, 100');
    });

    // E a razao de o snapshot existir: antes dele o endereco vinha de um join ao
    // vivo, e mudar o cadastro reescrevia o destino de pedidos ja entregues.
    it('preserva o endereco do pedido quando o cliente se muda depois', async () => {
        const customer = await createCustomer({ address: 'Rua Antiga, 1' });
        const admin = await createAdmin();
        const product = await createProduct();
        await createCartWith(customer, product);

        const criado = await request(app)
            .post('/orders/checkout')
            .set('Authorization', `Bearer ${tokenFor(customer)}`)
            .send({});

        await customer.update({ address: 'Avenida Nova, 999' });

        const detalhe = await request(app)
            .get(`/orders/${criado.body.id}`)
            .set('Authorization', `Bearer ${tokenFor(admin)}`);

        expect(detalhe.status).toBe(200);
        expect(detalhe.body.deliveryAddress).toBe('Rua Antiga, 1');
        // O contato segue sendo o atual: telefone e para ligar hoje, nao registro.
        expect(detalhe.body.customer.address).toBeUndefined();
    });

    it('guarda o cpf da nota no pedido, sem tocar no cadastro do cliente', async () => {
        const customer = await createCustomer({ cpf: null });
        const product = await createProduct();
        await createCartWith(customer, product);

        const res = await request(app)
            .post('/orders/checkout')
            .set('Authorization', `Bearer ${tokenFor(customer)}`)
            .send({ invoiceCpf: '11122233344' });

        expect(res.status).toBe(201);
        expect(res.body.invoiceCpf).toBe('11122233344');

        await customer.reload();
        expect(customer.cpf).toBeNull();
    });

    it('baixa o estoque do produto ao fechar o pedido', async () => {
        const customer = await createCustomer();
        const product = await createProduct({ stock: 5 });
        await createCartWith(customer, product, 3);

        await request(app)
            .post('/orders/checkout')
            .set('Authorization', `Bearer ${tokenFor(customer)}`)
            .send({});

        await product.reload();
        expect(product.stock).toBe(2);
    });

    it('recusa o pedido e nao mexe no estoque quando falta produto', async () => {
        const customer = await createCustomer();
        const product = await createProduct({ stock: 1 });
        await createCartWith(customer, product, 5);

        const res = await request(app)
            .post('/orders/checkout')
            .set('Authorization', `Bearer ${tokenFor(customer)}`)
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Estoque insuficiente/);

        await product.reload();
        expect(product.stock).toBe(1);
        expect(await Order.count()).toBe(0);
    });

    it('devolve cliente e produto na listagem do admin', async () => {
        const customer = await createCustomer({ name: 'Bruno Cliente' });
        const admin = await createAdmin();
        const product = await createProduct({ name: 'Cerveja Puro Malte' });
        await createCartWith(customer, product);

        await request(app)
            .post('/orders/checkout')
            .set('Authorization', `Bearer ${tokenFor(customer)}`)
            .send({});

        const list = await request(app)
            .get('/orders')
            .set('Authorization', `Bearer ${tokenFor(admin)}`);

        expect(list.status).toBe(200);
        expect(list.body.data).toHaveLength(1);
        expect(list.body.data[0].customer.name).toBe('Bruno Cliente');
        expect(list.body.data[0].items[0].product.name).toBe('Cerveja Puro Malte');
        // CPF nunca aparece em resposta de pedido.
        expect(list.body.data[0].customer.cpf).toBeUndefined();
    });

    it('filtra a listagem por status', async () => {
        const customer = await createCustomer();
        const admin = await createAdmin();
        const product = await createProduct({ stock: 50 });
        await createCartWith(customer, product);

        await request(app)
            .post('/orders/checkout')
            .set('Authorization', `Bearer ${tokenFor(customer)}`)
            .send({});

        const pendentes = await request(app)
            .get('/orders?status=PENDING')
            .set('Authorization', `Bearer ${tokenFor(admin)}`);
        const entregues = await request(app)
            .get('/orders?status=DELIVERED')
            .set('Authorization', `Bearer ${tokenFor(admin)}`);

        expect(pendentes.body.pagination.total).toBe(1);
        expect(entregues.body.pagination.total).toBe(0);
    });

    it('nao deixa um cliente ver o pedido de outro pela rota de admin', async () => {
        const dono = await createCustomer();
        const intruso = await createCustomer();
        const product = await createProduct();
        await createCartWith(dono, product);

        const criado = await request(app)
            .post('/orders/checkout')
            .set('Authorization', `Bearer ${tokenFor(dono)}`)
            .send({});

        const res = await request(app)
            .get(`/orders/${criado.body.id}`)
            .set('Authorization', `Bearer ${tokenFor(intruso)}`);

        expect(res.status).toBe(403);
    });

    it('escopa meus-pedidos pelo dono do token, ignorando o de outros', async () => {
        const ana = await createCustomer();
        const bruno = await createCustomer();
        const product = await createProduct({ stock: 50 });

        await createCartWith(ana, product);
        await request(app)
            .post('/orders/checkout')
            .set('Authorization', `Bearer ${tokenFor(ana)}`)
            .send({});

        await createCartWith(bruno, product);
        await request(app)
            .post('/orders/checkout')
            .set('Authorization', `Bearer ${tokenFor(bruno)}`)
            .send({});

        const res = await request(app)
            .get('/orders/my-orders')
            .set('Authorization', `Bearer ${tokenFor(ana)}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].customerId).toBe(ana.id);
    });
});

describe('Produtos (com banco)', () => {

    it('nao aceita campo fora do allowlist na criacao', async () => {
        const admin = await createAdmin();

        const res = await request(app)
            .post('/products')
            .set('Authorization', `Bearer ${tokenFor(admin)}`)
            .send({ name: 'Produto X', price: '10.00', stock: 1, id: 999 });

        expect(res.status).toBe(201);
        // O id veio no corpo mas foi ignorado: mass assignment barrado.
        expect(res.body.id).not.toBe(999);
        expect(await Product.count()).toBe(1);
    });
});
