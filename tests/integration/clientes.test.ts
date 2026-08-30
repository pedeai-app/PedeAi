import request from 'supertest';
import app from '../../src/app';
import { criarAdmin, criarCliente, tokenDe } from './helpers/fabricas';

describe('Clientes (com banco)', () => {

    // Este caso e o bug que a suite sem banco nao pegava: o validator trata cpf
    // como opcional, mas a checagem de duplicidade rodava incondicionalmente e a
    // query estourava com "WHERE parameter cpf has invalid undefined value".
    it('atualiza so o campo enviado, preservando os demais', async () => {
        const admin = await criarAdmin();
        const cliente = await criarCliente({
            nome: 'Nome Antigo',
            cpf: '12345678901',
            telefone: '41988887777',
        });

        const res = await request(app)
            .put(`/clientes/${cliente.id}`)
            .set('Authorization', `Bearer ${tokenDe(admin)}`)
            .send({ nome: 'Nome Novo' });

        expect(res.status).toBe(200);
        expect(res.body.nome).toBe('Nome Novo');
        expect(res.body.cpf).toBe('12345678901');
        expect(res.body.telefone).toBe('41988887777');
    });

    it('recusa cpf que ja pertence a outro cliente', async () => {
        const admin = await criarAdmin();
        const outro = await criarCliente({ cpf: '99988877766' });
        const alvo = await criarCliente({ cpf: '11122233344' });

        const res = await request(app)
            .put(`/clientes/${alvo.id}`)
            .set('Authorization', `Bearer ${tokenDe(admin)}`)
            .send({ cpf: outro.cpf });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/CPF/);

        await alvo.reload();
        expect(alvo.cpf).toBe('11122233344');
    });

    it('aceita reenviar o proprio cpf sem acusar duplicidade', async () => {
        const admin = await criarAdmin();
        const cliente = await criarCliente({ cpf: '11122233344' });

        const res = await request(app)
            .put(`/clientes/${cliente.id}`)
            .set('Authorization', `Bearer ${tokenDe(admin)}`)
            .send({ cpf: '11122233344', nome: 'Outro Nome' });

        expect(res.status).toBe(200);
    });

    it('nao permite alterar email, senha ou role pelo PUT', async () => {
        const admin = await criarAdmin();
        const cliente = await criarCliente({ email: 'original@teste.com' });

        const res = await request(app)
            .put(`/clientes/${cliente.id}`)
            .set('Authorization', `Bearer ${tokenDe(admin)}`)
            .send({ nome: 'Novo', email: 'invasor@teste.com', role: 'ADMIN' });

        expect(res.status).toBe(200);

        await cliente.reload();
        expect(cliente.email).toBe('original@teste.com');
        expect(cliente.role).toBe('CLIENTE');
    });

    it('nao expoe a senha na listagem', async () => {
        const admin = await criarAdmin();
        await criarCliente();

        const res = await request(app)
            .get('/clientes')
            .set('Authorization', `Bearer ${tokenDe(admin)}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        for (const cliente of res.body.data) {
            expect(cliente.senha).toBeUndefined();
        }
    });
});

describe('Cadastro (com banco)', () => {

    it('cria cliente sem cpf', async () => {
        const res = await request(app).post('/auth/register').send({
            nome: 'Sem Documento',
            telefone: '41999998888',
            endereco: 'Rua Sem Cpf, 1',
            email: 'semcpf@teste.com',
            senha: 'senha123',
        });

        expect(res.status).toBe(201);
        expect(res.body.cpf).toBeNull();
        expect(res.body.senha).toBeUndefined();
        // Role nunca vem do corpo: e fixa no service.
        expect(res.body.role).toBe('CLIENTE');
    });

    it('ignora role enviada no corpo do cadastro', async () => {
        const res = await request(app).post('/auth/register').send({
            nome: 'Tentativa Admin',
            telefone: '41999998888',
            endereco: 'Rua X, 1',
            email: 'tentativa@teste.com',
            senha: 'senha123',
            role: 'ADMIN',
        });

        expect(res.status).toBe(201);
        expect(res.body.role).toBe('CLIENTE');
    });

    it('acusa cpf ja cadastrado com mensagem propria', async () => {
        await criarCliente({ cpf: '12345678901' });

        const res = await request(app).post('/auth/register').send({
            nome: 'Outro Alguem',
            cpf: '12345678901',
            telefone: '41999998888',
            endereco: 'Rua Y, 2',
            email: 'outro@teste.com',
            senha: 'senha123',
        });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('CPF ja cadastrado.');
    });
});
