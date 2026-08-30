import request from 'supertest';
import app from '../../src/app';
import { Cliente } from '../../src/models/Cliente';
import { Pedido } from '../../src/models/Pedido';
import { StatusCliente } from '../../src/enum/StatusCliente';
import {
    SENHA_PADRAO,
    criarAdmin,
    criarCarrinhoCom,
    criarCliente,
    criarProduto,
    tokenDe,
} from './helpers/fabricas';

describe('Desativacao de cliente (com banco)', () => {

    // O caso que motivou o PR. Antes, este mesmo DELETE zerava a tabela de
    // pedidos do cliente pela cascata das FKs — e nenhum teste percebia.
    it('desativa sem apagar o cliente nem os pedidos dele', async () => {
        const admin = await criarAdmin();
        const cliente = await criarCliente();
        const produto = await criarProduto();
        await criarCarrinhoCom(cliente, produto);

        const pedido = await request(app)
            .post('/pedidos/finalizar')
            .set('Authorization', `Bearer ${tokenDe(cliente)}`)
            .send({});
        expect(pedido.status).toBe(201);

        const res = await request(app)
            .delete(`/clientes/${cliente.id}`)
            .set('Authorization', `Bearer ${tokenDe(admin)}`);

        expect(res.status).toBe(204);

        await cliente.reload();
        expect(cliente.status).toBe(StatusCliente.INATIVO);
        expect(await Pedido.count({ where: { clienteId: cliente.id } })).toBe(1);
    });

    it('some da listagem padrao e reaparece com ?status=INATIVO', async () => {
        const admin = await criarAdmin();
        const cliente = await criarCliente();

        await request(app)
            .delete(`/clientes/${cliente.id}`)
            .set('Authorization', `Bearer ${tokenDe(admin)}`);

        const padrao = await request(app)
            .get('/clientes')
            .set('Authorization', `Bearer ${tokenDe(admin)}`);
        expect(padrao.body.data.map((c: Cliente) => c.id)).not.toContain(cliente.id);

        const inativos = await request(app)
            .get('/clientes?status=INATIVO')
            .set('Authorization', `Bearer ${tokenDe(admin)}`);
        expect(inativos.body.data.map((c: Cliente) => c.id)).toEqual([cliente.id]);

        const todos = await request(app)
            .get('/clientes?status=TODOS')
            .set('Authorization', `Bearer ${tokenDe(admin)}`);
        expect(todos.body.data.map((c: Cliente) => c.id)).toEqual(
            expect.arrayContaining([admin.id, cliente.id]),
        );
    });

    // A paginacao conta em cima do mesmo where do filtro. Se o total ignorasse o
    // status, a tela mostraria "3 clientes" numa pagina com 2 linhas.
    it('conta o total ja com o filtro aplicado', async () => {
        const admin = await criarAdmin();
        const cliente = await criarCliente();
        await criarCliente();

        await request(app)
            .delete(`/clientes/${cliente.id}`)
            .set('Authorization', `Bearer ${tokenDe(admin)}`);

        const res = await request(app)
            .get('/clientes')
            .set('Authorization', `Bearer ${tokenDe(admin)}`);

        expect(res.body.pagination.total).toBe(2);
        expect(res.body.data).toHaveLength(2);
    });

    it('cliente desativado nao consegue logar', async () => {
        const admin = await criarAdmin();
        const cliente = await criarCliente({ email: 'desativado@teste.com' });

        await request(app)
            .delete(`/clientes/${cliente.id}`)
            .set('Authorization', `Bearer ${tokenDe(admin)}`);

        const login = await request(app)
            .post('/auth/login')
            .send({ email: 'desativado@teste.com', senha: SENHA_PADRAO });

        expect(login.status).toBe(401);
        // Mesma mensagem de senha errada: nao confirma que a conta existe.
        expect(login.body.message).toBe('Credenciais invalidas.');
    });

    it('reativar devolve o acesso', async () => {
        const admin = await criarAdmin();
        const cliente = await criarCliente({ email: 'volta@teste.com' });

        await request(app)
            .delete(`/clientes/${cliente.id}`)
            .set('Authorization', `Bearer ${tokenDe(admin)}`);

        const res = await request(app)
            .post(`/clientes/${cliente.id}/reativar`)
            .set('Authorization', `Bearer ${tokenDe(admin)}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe(StatusCliente.ATIVO);

        const login = await request(app)
            .post('/auth/login')
            .send({ email: 'volta@teste.com', senha: SENHA_PADRAO });

        expect(login.status).toBe(200);
    });

    // ?status=constructor passava por uma checagem feita com o operador `in`,
    // que enxerga o prototype do enum, e chegava no Postgres como enum invalido.
    it('ignora status que so existe no prototype do enum', async () => {
        const admin = await criarAdmin();

        const res = await request(app)
            .get('/clientes?status=constructor')
            .set('Authorization', `Bearer ${tokenDe(admin)}`);

        expect(res.status).toBe(200);
        expect(res.body.data.map((c: Cliente) => c.id)).toEqual([admin.id]);
    });

    it('responde 404 ao desativar id inexistente', async () => {
        const admin = await criarAdmin();

        const res = await request(app)
            .delete('/clientes/999999')
            .set('Authorization', `Bearer ${tokenDe(admin)}`);

        expect(res.status).toBe(404);
    });

    it('nao deixa o PUT mexer no status', async () => {
        const admin = await criarAdmin();
        const cliente = await criarCliente();

        const res = await request(app)
            .put(`/clientes/${cliente.id}`)
            .set('Authorization', `Bearer ${tokenDe(admin)}`)
            .send({ nome: 'Nome Novo', status: 'INATIVO' });

        expect(res.status).toBe(200);

        await cliente.reload();
        expect(cliente.status).toBe(StatusCliente.ATIVO);
    });
});
