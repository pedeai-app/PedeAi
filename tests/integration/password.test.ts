import request from 'supertest';
import app from '../../src/app';
import { DEFAULT_PASSWORD, createAdmin, createCustomer, tokenFor } from './helpers/factories';

// Ciclo completo do reset pelo lojista. O valor da senha temporaria so existe na
// resposta do reset, entao este e o unico lugar onde da para verificar que ela
// realmente funciona — e que para de funcionar depois da troca.
describe('Reset de senha pelo lojista (com banco)', () => {

    it('percorre o ciclo: reset, login, troca e invalidacao da temporaria', async () => {
        const admin = await createAdmin();
        const customer = await createCustomer({ email: 'esqueci@teste.com' });

        const reset = await request(app)
            .post(`/customers/${customer.id}/reset-password`)
            .set('Authorization', `Bearer ${tokenFor(admin)}`);

        expect(reset.status).toBe(200);
        const temporaria: string = reset.body.temporaryPassword;
        expect(temporaria).toHaveLength(10);
        // Sem caracteres ambiguos: a senha vai ser ditada ou copiada de uma
        // mensagem, e 0/O e 1/l custam uma segunda ligacao.
        expect(temporaria).not.toMatch(/[0O1lI]/);

        const login = await request(app)
            .post('/auth/login')
            .send({ email: 'esqueci@teste.com', password: temporaria });

        expect(login.status).toBe(200);
        expect(login.body.customer.temporaryPassword).toBe(true);

        const troca = await request(app)
            .post('/auth/change-password')
            .set('Authorization', `Bearer ${login.body.token}`)
            .send({ currentPassword: temporaria, newPassword: 'minhasenha456' });

        expect(troca.status).toBe(200);

        const comNova = await request(app)
            .post('/auth/login')
            .send({ email: 'esqueci@teste.com', password: 'minhasenha456' });

        expect(comNova.status).toBe(200);
        expect(comNova.body.customer.temporaryPassword).toBe(false);

        // O que o lojista conhecia deixou de abrir a conta.
        const comTemporaria = await request(app)
            .post('/auth/login')
            .send({ email: 'esqueci@teste.com', password: temporaria });

        expect(comTemporaria.status).toBe(401);
    });

    it('invalida a senha antiga assim que o lojista reseta', async () => {
        const admin = await createAdmin();
        const customer = await createCustomer({ email: 'antiga@teste.com' });

        await request(app)
            .post(`/customers/${customer.id}/reset-password`)
            .set('Authorization', `Bearer ${tokenFor(admin)}`);

        const res = await request(app)
            .post('/auth/login')
            .send({ email: 'antiga@teste.com', password: DEFAULT_PASSWORD });

        expect(res.status).toBe(401);
    });

    it('recusa a troca quando a senha atual esta errada', async () => {
        const customer = await createCustomer();

        const res = await request(app)
            .post('/auth/change-password')
            .set('Authorization', `Bearer ${tokenFor(customer)}`)
            .send({ currentPassword: 'chute', newPassword: 'outrasenha123' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Senha atual incorreta.');
    });

    it('recusa trocar por uma senha igual a atual', async () => {
        const customer = await createCustomer();

        const res = await request(app)
            .post('/auth/change-password')
            .set('Authorization', `Bearer ${tokenFor(customer)}`)
            .send({ currentPassword: DEFAULT_PASSWORD, newPassword: DEFAULT_PASSWORD });

        expect(res.status).toBe(400);
    });

    it('troca a senha do dono do token, nunca a de outro cliente', async () => {
        const alvo = await createCustomer({ email: 'alvo@teste.com' });
        const atacante = await createCustomer();

        // O corpo nao tem como apontar outro cliente: o id vem do token. Este
        // teste existe para que uma futura leitura de req.body.clienteId falhe.
        await request(app)
            .post('/auth/change-password')
            .set('Authorization', `Bearer ${tokenFor(atacante)}`)
            .send({ currentPassword: DEFAULT_PASSWORD, newPassword: 'senhaNova789' });

        const alvoAindaEntra = await request(app)
            .post('/auth/login')
            .send({ email: 'alvo@teste.com', password: DEFAULT_PASSWORD });

        expect(alvoAindaEntra.status).toBe(200);

        await alvo.reload();
        expect(alvo.temporaryPassword).toBe(false);
    });
});
