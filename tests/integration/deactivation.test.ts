import request from 'supertest';
import app from '../../src/app';
import { Customer } from '../../src/models/Customer';
import { Order } from '../../src/models/Order';
import { CustomerStatus } from '../../src/enum/CustomerStatus';
import {
    DEFAULT_PASSWORD,
    createAdmin,
    createCartWith,
    createCustomer,
    createProduct,
    tokenFor,
} from './helpers/factories';

describe('Desativacao de cliente (com banco)', () => {

    // O caso que motivou o PR. Antes, este mesmo DELETE zerava a tabela de
    // pedidos do cliente pela cascata das FKs — e nenhum teste percebia.
    it('desativa sem apagar o cliente nem os pedidos dele', async () => {
        const admin = await createAdmin();
        const customer = await createCustomer();
        const product = await createProduct();
        await createCartWith(customer, product);

        const order = await request(app)
            .post('/pedidos/finalizar')
            .set('Authorization', `Bearer ${tokenFor(customer)}`)
            .send({});
        expect(order.status).toBe(201);

        const res = await request(app)
            .delete(`/clientes/${customer.id}`)
            .set('Authorization', `Bearer ${tokenFor(admin)}`);

        expect(res.status).toBe(204);

        await customer.reload();
        expect(customer.status).toBe(CustomerStatus.INATIVO);
        expect(await Order.count({ where: { clienteId: customer.id } })).toBe(1);
    });

    it('some da listagem padrao e reaparece com ?status=INATIVO', async () => {
        const admin = await createAdmin();
        const customer = await createCustomer();

        await request(app)
            .delete(`/clientes/${customer.id}`)
            .set('Authorization', `Bearer ${tokenFor(admin)}`);

        const padrao = await request(app)
            .get('/clientes')
            .set('Authorization', `Bearer ${tokenFor(admin)}`);
        expect(padrao.body.data.map((c: Customer) => c.id)).not.toContain(customer.id);

        const inativos = await request(app)
            .get('/clientes?status=INATIVO')
            .set('Authorization', `Bearer ${tokenFor(admin)}`);
        expect(inativos.body.data.map((c: Customer) => c.id)).toEqual([customer.id]);

        const todos = await request(app)
            .get('/clientes?status=TODOS')
            .set('Authorization', `Bearer ${tokenFor(admin)}`);
        expect(todos.body.data.map((c: Customer) => c.id)).toEqual(
            expect.arrayContaining([admin.id, customer.id]),
        );
    });

    // A paginacao conta em cima do mesmo where do filtro. Se o total ignorasse o
    // status, a tela mostraria "3 clientes" numa pagina com 2 linhas.
    it('conta o total ja com o filtro aplicado', async () => {
        const admin = await createAdmin();
        const customer = await createCustomer();
        await createCustomer();

        await request(app)
            .delete(`/clientes/${customer.id}`)
            .set('Authorization', `Bearer ${tokenFor(admin)}`);

        const res = await request(app)
            .get('/clientes')
            .set('Authorization', `Bearer ${tokenFor(admin)}`);

        expect(res.body.pagination.total).toBe(2);
        expect(res.body.data).toHaveLength(2);
    });

    it('cliente desativado nao consegue logar', async () => {
        const admin = await createAdmin();
        const customer = await createCustomer({ email: 'desativado@teste.com' });

        await request(app)
            .delete(`/clientes/${customer.id}`)
            .set('Authorization', `Bearer ${tokenFor(admin)}`);

        const login = await request(app)
            .post('/auth/login')
            .send({ email: 'desativado@teste.com', senha: DEFAULT_PASSWORD });

        expect(login.status).toBe(401);
        // Mesma mensagem de senha errada: nao confirma que a conta existe.
        expect(login.body.message).toBe('Credenciais invalidas.');
    });

    it('reativar devolve o acesso', async () => {
        const admin = await createAdmin();
        const customer = await createCustomer({ email: 'volta@teste.com' });

        await request(app)
            .delete(`/clientes/${customer.id}`)
            .set('Authorization', `Bearer ${tokenFor(admin)}`);

        const res = await request(app)
            .post(`/clientes/${customer.id}/reativar`)
            .set('Authorization', `Bearer ${tokenFor(admin)}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe(CustomerStatus.ATIVO);

        const login = await request(app)
            .post('/auth/login')
            .send({ email: 'volta@teste.com', senha: DEFAULT_PASSWORD });

        expect(login.status).toBe(200);
    });

    // ?status=constructor passava por uma checagem feita com o operador `in`,
    // que enxerga o prototype do enum, e chegava no Postgres como enum invalido.
    it('ignora status que so existe no prototype do enum', async () => {
        const admin = await createAdmin();

        const res = await request(app)
            .get('/clientes?status=constructor')
            .set('Authorization', `Bearer ${tokenFor(admin)}`);

        expect(res.status).toBe(200);
        expect(res.body.data.map((c: Customer) => c.id)).toEqual([admin.id]);
    });

    it('responde 404 ao desativar id inexistente', async () => {
        const admin = await createAdmin();

        const res = await request(app)
            .delete('/clientes/999999')
            .set('Authorization', `Bearer ${tokenFor(admin)}`);

        expect(res.status).toBe(404);
    });

    it('nao deixa o PUT mexer no status', async () => {
        const admin = await createAdmin();
        const customer = await createCustomer();

        const res = await request(app)
            .put(`/clientes/${customer.id}`)
            .set('Authorization', `Bearer ${tokenFor(admin)}`)
            .send({ nome: 'Nome Novo', status: 'INATIVO' });

        expect(res.status).toBe(200);

        await customer.reload();
        expect(customer.status).toBe(CustomerStatus.ATIVO);
    });
});
