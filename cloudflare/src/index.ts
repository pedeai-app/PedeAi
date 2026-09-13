import { Container, getContainer } from '@cloudflare/containers';
import { env } from 'cloudflare:workers';

export interface Env {
    API: DurableObjectNamespace<ApiContainer>;
    DATABASE_URL: string;
    JWT_SECRET: string;
    TRUST_PROXY: string;
    CORS_ORIGIN: string;
    // Fotos dos produtos (R2 pela interface S3). As chaves sao segredos; o resto, vars.
    R2_ACCOUNT_ID: string;
    R2_BUCKET_IMAGENS: string;
    IMAGENS_URL_PUBLICA: string;
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
}

const config = env as unknown as Env;

function somenteDefinidas(variaveis: Record<string, string | undefined>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(variaveis).filter(
            (par): par is [string, string] => typeof par[1] === 'string' && par[1].length > 0,
        ),
    );
}

// A API Express, rodando a imagem do Dockerfile da raiz.
export class ApiContainer extends Container<Env> {
    defaultPort = 3000;

    // Quanto tempo sem requisicao ate desligar. Desligado nao cobra, mas o proximo
    // acesso espera o container subir (uns 5 s medidos). 30 min cobre uma visita
    // inteira sem religar no meio.
    sleepAfter = '30m';

    // Sobe o servidor direto, sem o `npm run db:migrate` do CMD da imagem: as
    // migrations rodam no deploy (ver .github/workflows/deploy.yml). Rodar a cada
    // partida somava 36 s medidos no lite e repetiria o trabalho a cada vez que o
    // container acorda. O CMD continua valendo para o docker compose.
    entrypoint = ['node', 'dist/server.js'];

    // A checagem de saude bate na rota /ping do Express, que responde sem tocar
    // no banco.
    pingEndpoint = 'localhost/ping';

    // So as definidas: um segredo ainda nao cadastrado chegaria ao container como o
    // texto "undefined", e a API acharia que o R2 esta configurado.
    envVars = somenteDefinidas({
        DATABASE_URL: config.DATABASE_URL,
        JWT_SECRET: config.JWT_SECRET,
        TRUST_PROXY: config.TRUST_PROXY,
        CORS_ORIGIN: config.CORS_ORIGIN,
        PORT: '3000',
        R2_ACCOUNT_ID: config.R2_ACCOUNT_ID,
        R2_BUCKET_IMAGENS: config.R2_BUCKET_IMAGENS,
        IMAGENS_URL_PUBLICA: config.IMAGENS_URL_PUBLICA,
        R2_ACCESS_KEY_ID: config.R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY: config.R2_SECRET_ACCESS_KEY,
    });
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Sempre a mesma instancia, pelo nome: com max_instances 1 nao ha outra, e
        // o nome fixo garante que todo acesso cai no container que ja esta ligado.
        return getContainer(env.API, 'api').fetch(request);
    },
} satisfies ExportedHandler<Env>;
