import request from 'supertest';
import app from '../../src/app';
import { criarCliente } from './helpers/fabricas';

// O bug que este arquivo existe para impedir: sem `trust proxy` e sem keyGenerator,
// o express-rate-limit conta por `req.ip`, que atras do tunel e o IP do container
// do proxy — igual para todo mundo. Na pratica a loja inteira dividia um balde so,
// e cinco senhas erradas de um cliente trancavam o login de todos os outros.
describe('Rate limit atras do proxy (com banco)', () => {

    const errarLogin = (ip: string) =>
        request(app)
            .post('/auth/login')
            .set('CF-Connecting-IP', ip)
            .send({ email: 'naoexiste@teste.com', senha: 'senhaerrada' });

    it('nao deixa um visitante consumir o limite de login dos outros', async () => {
        await criarCliente({ email: 'alvo@teste.com' });

        // O limite do login e 5 tentativas malsucedidas por visitante.
        for (let i = 0; i < 5; i += 1) {
            const res = await errarLogin('203.0.113.10');
            expect(res.status).toBe(401);
        }

        const bloqueado = await errarLogin('203.0.113.10');
        expect(bloqueado.status).toBe(429);

        // Outro visitante, mesmo proxy: precisa continuar entrando.
        const outro = await errarLogin('198.51.100.20');
        expect(outro.status).toBe(401);
    });

    it('separa os visitantes por IP real, nao pelo IP do proxy', async () => {
        // Os dois chegam pelo mesmo socket (o container do proxy) e so se
        // distinguem pelo header que a borda da Cloudflare injeta.
        const primeiro = await errarLogin('203.0.113.30');
        const segundo = await errarLogin('203.0.113.31');

        expect(primeiro.headers['ratelimit-remaining']).toBe('4');
        expect(segundo.headers['ratelimit-remaining']).toBe('4');
    });
});
