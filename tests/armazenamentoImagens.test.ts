import { armazenamentoImagens, definirArmazenamentoImagens } from '../src/services/armazenamentoImagens';

// O R2 real nunca roda nos testes (a suite de integracao usa um armazenamento em
// memoria). Aqui o fetch e simulado para conferir o que a API faz com as respostas
// do R2 — em especial, que o motivo do erro chega ao log.
describe('ArmazenamentoR2', () => {
    const envOriginal = { ...process.env };
    let fetchSimulado: jest.SpyInstance;

    beforeEach(() => {
        Object.assign(process.env, {
            R2_ACCOUNT_ID: 'conta123',
            R2_ACCESS_KEY_ID: 'a'.repeat(32),
            R2_SECRET_ACCESS_KEY: 'b'.repeat(64),
            R2_BUCKET_IMAGENS: 'pedeai-imagens',
            IMAGENS_URL_PUBLICA: 'https://imagens.teste/',
        });
        definirArmazenamentoImagens(undefined as unknown as null);
        fetchSimulado = jest.spyOn(global, 'fetch');
    });

    afterEach(() => {
        fetchSimulado.mockRestore();
        process.env = { ...envOriginal };
        definirArmazenamentoImagens(undefined as unknown as null);
    });

    function r2() {
        const armazenamento = armazenamentoImagens();
        if (!armazenamento) throw new Error('armazenamento nao configurado no teste');
        return armazenamento;
    }

    it('envia com PUT no endpoint S3 da conta, com tipo e cache de um ano', async () => {
        fetchSimulado.mockResolvedValue(new Response(null, { status: 200 }));

        await r2().enviar('produtos/1/abc-800.jpg', Buffer.from([0xff, 0xd8]), 'image/jpeg');

        const requisicao = fetchSimulado.mock.calls[0][0] as Request;
        expect(requisicao.method).toBe('PUT');
        expect(requisicao.url).toBe('https://conta123.r2.cloudflarestorage.com/pedeai-imagens/produtos/1/abc-800.jpg');
        expect(requisicao.headers.get('content-type')).toBe('image/jpeg');
        expect(requisicao.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
        expect(requisicao.headers.get('authorization')).toMatch(/^AWS4-HMAC-SHA256 Credential=a{32}\/\d{8}\/auto\/s3\/aws4_request/);
    });

    it('ignora espaco e quebra de linha colados junto com a chave', async () => {
        process.env.R2_ACCESS_KEY_ID = ` ${'c'.repeat(32)}
`;
        definirArmazenamentoImagens(undefined as unknown as null);
        fetchSimulado.mockResolvedValue(new Response(null, { status: 200 }));

        await r2().enviar('x.jpg', Buffer.from([1]), 'image/jpeg');

        const requisicao = fetchSimulado.mock.calls[0][0] as Request;
        expect(requisicao.headers.get('authorization')).toContain(`Credential=${'c'.repeat(32)}/`);
    });

    // Um 400 sozinho nao diz se a chave foi colada errada ou se a requisicao esta
    // mal montada. O corpo do R2 diz.
    it('poe o codigo e a mensagem do R2 no erro', async () => {
        fetchSimulado.mockResolvedValue(
            new Response(
                '<?xml version="1.0" encoding="UTF-8"?><Error><Code>InvalidArgument</Code><Message>Credential access key has length 53, should be 32</Message></Error>',
                { status: 400 },
            ),
        );

        await expect(r2().enviar('produtos/1/abc-800.jpg', Buffer.from([1]), 'image/jpeg')).rejects.toThrow(
            'R2 recusou o envio de produtos/1/abc-800.jpg: HTTP 400 (InvalidArgument: Credential access key has length 53, should be 32)',
        );
    });

    // Instabilidade do R2 nao pode deixar o envio pendurado: o padrao do aws4fetch
    // seria repetir ate 10 vezes com espera crescente.
    it('com o R2 instavel, tenta so mais duas vezes e desiste com o status', async () => {
        fetchSimulado.mockImplementation(async () => new Response('falhou', { status: 502 }));

        await expect(r2().enviar('x.jpg', Buffer.from([1]), 'image/jpeg')).rejects.toThrow(/HTTP 502$/);
        expect(fetchSimulado).toHaveBeenCalledTimes(3);
    });

    it('apagar trata 404 como apagado e explica os outros erros', async () => {
        fetchSimulado.mockResolvedValueOnce(new Response(null, { status: 404 }));
        await expect(r2().apagar('sumiu.jpg')).resolves.toBeUndefined();

        fetchSimulado.mockResolvedValueOnce(
            new Response('<Error><Code>AccessDenied</Code><Message>Access Denied</Message></Error>', { status: 403 }),
        );
        await expect(r2().apagar('x.jpg')).rejects.toThrow('HTTP 403 (AccessDenied: Access Denied)');
    });
});
