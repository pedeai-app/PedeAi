import request from 'supertest';
import app from '../../src/app';
import { createAdmin, createCustomer, tokenFor } from './helpers/factories';

describe('Clientes (com banco)', () => {

    // Este caso e o bug que a suite sem banco nao pegava: o validator trata cpf
    // como opcional, mas a checagem de duplicidade rodava incondicionalmente e a
    // query estourava com "WHERE parameter cpf has invalid undefined value".
    it('atualiza so o campo enviado, preservando os demais', async () => {
        const admin = await createAdmin();
        const customer = await createCustomer({
            name: 'Nome Antigo',
            cpf: '12345678901',
            phone: '41988887777',
        });

        const res = await request(app)
            .put(`/customers/${customer.id}`)
            .set('Authorization', `Bearer ${tokenFor(admin)}`)
            .send({ name: 'Nome Novo' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Nome Novo');
        expect(res.body.cpf).toBe('12345678901');
        expect(res.body.phone).toBe('41988887777');
    });

    it('recusa cpf que ja pertence a outro cliente', async () => {
        const admin = await createAdmin();
        const outro = await createCustomer({ cpf: '99988877766' });
        const alvo = await createCustomer({ cpf: '11122233344' });

        const res = await request(app)
            .put(`/customers/${alvo.id}`)
            .set('Authorization', `Bearer ${tokenFor(admin)}`)
            .send({ cpf: outro.cpf });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/CPF/);

        await alvo.reload();
        expect(alvo.cpf).toBe('11122233344');
    });

    it('aceita reenviar o proprio cpf sem acusar duplicidade', async () => {
        const admin = await createAdmin();
        const customer = await createCustomer({ cpf: '11122233344' });

        const res = await request(app)
            .put(`/customers/${customer.id}`)
            .set('Authorization', `Bearer ${tokenFor(admin)}`)
            .send({ cpf: '11122233344', name: 'Outro Nome' });

        expect(res.status).toBe(200);
    });

    it('nao permite alterar email, senha ou role pelo PUT', async () => {
        const admin = await createAdmin();
        const customer = await createCustomer({ email: 'original@teste.com' });

        const res = await request(app)
            .put(`/customers/${customer.id}`)
            .set('Authorization', `Bearer ${tokenFor(admin)}`)
            .send({ name: 'Novo', email: 'invasor@teste.com', role: 'ADMIN' });

        expect(res.status).toBe(200);

        await customer.reload();
        expect(customer.email).toBe('original@teste.com');
        expect(customer.role).toBe('CUSTOMER');
    });

    it('nao expoe a senha na listagem', async () => {
        const admin = await createAdmin();
        await createCustomer();

        const res = await request(app)
            .get('/customers')
            .set('Authorization', `Bearer ${tokenFor(admin)}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        for (const customer of res.body.data) {
            expect(customer.password).toBeUndefined();
        }
    });
});

describe('Cadastro (com banco)', () => {

    it('cria cliente sem cpf', async () => {
        const res = await request(app).post('/auth/register').send({
            name: 'Sem Documento',
            phone: '41999998888',
            address: 'Rua Sem Cpf, 1',
            email: 'semcpf@teste.com',
            password: 'senha123',
        });

        expect(res.status).toBe(201);
        expect(res.body.cpf).toBeNull();
        expect(res.body.password).toBeUndefined();
        // Role nunca vem do corpo: e fixa no service.
        expect(res.body.role).toBe('CUSTOMER');
    });

    it('ignora role enviada no corpo do cadastro', async () => {
        const res = await request(app).post('/auth/register').send({
            name: 'Tentativa Admin',
            phone: '41999998888',
            address: 'Rua X, 1',
            email: 'tentativa@teste.com',
            password: 'senha123',
            role: 'ADMIN',
        });

        expect(res.status).toBe(201);
        expect(res.body.role).toBe('CUSTOMER');
    });

    it('acusa cpf ja cadastrado com mensagem propria', async () => {
        await createCustomer({ cpf: '12345678901' });

        const res = await request(app).post('/auth/register').send({
            name: 'Outro Alguem',
            cpf: '12345678901',
            phone: '41999998888',
            address: 'Rua Y, 2',
            email: 'outro@teste.com',
            password: 'senha123',
        });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('CPF ja cadastrado.');
    });
});
