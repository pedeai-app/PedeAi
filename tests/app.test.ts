import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';

const sign = (payload: object) =>
    jwt.sign(payload, process.env.JWT_SECRET as string);

// Estes testes exercitam apenas a camada de middleware (validação, autenticação,
// autorização, 404 e parsing), que responde antes de qualquer acesso ao banco.
describe('Middlewares de segurança e validação (sem banco)', () => {

    describe('Rota inexistente', () => {
        it('retorna 404 JSON', async () => {
            const res = await request(app).get('/rota-que-nao-existe');
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ message: 'Rota não encontrada.' });
        });
    });

    describe('JSON malformado', () => {
        it('retorna 400 para corpo JSON inválido', async () => {
            const res = await request(app)
                .post('/auth/login')
                .set('Content-Type', 'application/json')
                .send('{ invalido ');
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/JSON inválido/);
        });
    });

    describe('Autenticação (authMiddleware)', () => {
        it('retorna 401 sem token em rota protegida', async () => {
            const res = await request(app).get('/carrinho');
            expect(res.status).toBe(401);
        });

        it('retorna 401 com token inválido', async () => {
            const res = await request(app)
                .get('/carrinho')
                .set('Authorization', 'Bearer token.invalido.aqui');
            expect(res.status).toBe(401);
        });
    });

    describe('Autorização (roleMiddleware)', () => {
        it('retorna 403 quando CLIENTE acessa rota ADMIN', async () => {
            const token = sign({ id: 1, role: 'CLIENTE' });
            const res = await request(app)
                .get('/clientes')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(403);
        });
    });

    describe('Validação (express-validator)', () => {
        it('retorna 422 no register com corpo vazio', async () => {
            const res = await request(app).post('/auth/register').send({});
            expect(res.status).toBe(422);
            expect(Array.isArray(res.body.errors)).toBe(true);
        });

        it('retorna 422 no login sem senha', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({ email: 'a@b.com' });
            expect(res.status).toBe(422);
        });

        it('retorna 422 ao adicionar no carrinho com quantidade inválida', async () => {
            const token = sign({ id: 1, role: 'CLIENTE' });
            const res = await request(app)
                .post('/carrinho/adicionar')
                .set('Authorization', `Bearer ${token}`)
                .send({ produtoId: 1, quantidade: 0 });
            expect(res.status).toBe(422);
        });

        it('retorna 422 ao filtrar pedidos por status invalido', async () => {
            const token = sign({ id: 1, role: 'ADMIN' });
            const res = await request(app)
                .get('/pedidos?status=INVALIDO')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(422);
        });
    });

    // Fica por ultimo de proposito: o limitador conta por IP e a suite inteira
    // compartilha o mesmo, entao estourar o limite aqui nao afeta os testes acima.
    describe('Rate limit do cadastro', () => {
        it('responde 429 depois de repetidas chamadas ao register', async () => {
            // Corpo vazio: para no validator, sem tocar o banco, mas ja conta
            // para o limitador, que roda antes dele.
            let ultimoStatus = 0;
            for (let i = 0; i < 12 && ultimoStatus !== 429; i++) {
                const res = await request(app).post('/auth/register').send({});
                ultimoStatus = res.status;
            }
            expect(ultimoStatus).toBe(429);
        });
    });
});
