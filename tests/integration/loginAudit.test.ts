import request from 'supertest';
import app from '../../src/app';
import { AuditLog } from '../../src/models/AuditLog';
import { CustomerStatus } from '../../src/enum/CustomerStatus';
import { createCustomer, DEFAULT_PASSWORD } from './helpers/factories';

function login(email: string, password: string) {
    return request(app).post('/auth/login').send({ email, password });
}

async function logs() {
    const rows = await AuditLog.findAll({ order: [['createdAt', 'ASC']] });
    return rows.map((row) => ({ action: row.action, userId: row.userId, createdBy: row.createdBy, origin: row.origin }));
}

describe('Log de login', () => {

    it('grava o login que deu certo', async () => {
        const customer = await createCustomer();

        const res = await login(customer.email, DEFAULT_PASSWORD);

        expect(res.status).toBe(200);
        expect(await logs()).toEqual([
            { action: 'LOGIN_SUCCEEDED', userId: customer.id, createdBy: customer.id, origin: 'API' },
        ]);
    });

    it('grava senha errada com o usuario e email inexistente sem usuario', async () => {
        const customer = await createCustomer();

        expect((await login(customer.email, 'errada123')).status).toBe(401);
        expect((await login('ninguem@teste.com', 'qualquer1')).status).toBe(401);

        expect(await logs()).toEqual([
            { action: 'LOGIN_FAILED', userId: customer.id, createdBy: null, origin: 'API' },
            { action: 'LOGIN_FAILED', userId: null, createdBy: null, origin: 'API' },
        ]);
    });

    it('grava a tentativa de conta inativa, com a mesma resposta de senha errada', async () => {
        const customer = await createCustomer({ status: CustomerStatus.INACTIVE });

        const res = await login(customer.email, DEFAULT_PASSWORD);

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Credenciais invalidas.');
        expect(await logs()).toEqual([
            { action: 'LOGIN_DENIED_INACTIVE', userId: customer.id, createdBy: null, origin: 'API' },
        ]);
    });

    it('nunca grava a senha', async () => {
        const customer = await createCustomer();

        await login(customer.email, 'senha-que-nao-pode-vazar');

        const rows = await AuditLog.findAll();
        expect(JSON.stringify(rows.map((row) => row.toJSON()))).not.toContain('senha-que-nao-pode-vazar');
    });
});
