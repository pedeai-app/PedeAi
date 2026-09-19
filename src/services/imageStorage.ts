import { AwsClient } from "aws4fetch";

/**
 * Onde ficam as fotos dos produtos.
 *
 * Interface porque ha duas implementacoes de verdade: o R2 da Cloudflare em
 * producao e uma em memoria nos testes — sem ela, a suite de integracao gravaria
 * no bucket real a cada rodada.
 */
export interface ImageStorage {
    upload(key: string, content: Buffer, tipo: string): Promise<void>;
    apagar(key: string): Promise<void>;
    publicUrl(key: string): string;
    /** A chave do objeto, se a URL for deste armazenamento; null para URL de fora. */
    keyFromUrl(url: string): string | null;
}

// Chaves sao unicas por envio (ver imagemProdutoService), entao o conteudo de uma
// URL nunca muda: a borda e o navegador podem guardar por um ano.
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

/**
 * O motivo que o R2 devolve no corpo do erro (XML da API S3), para o log dizer por
 * que falhou e nao so o status. Sem isto um 400 nao diferencia "chave de acesso
 * colada errada" de "requisicao mal montada". O corpo nunca traz a chave secreta.
 */
async function r2Reason(response: Response): Promise<string> {
    const body = await response.text().catch(() => "");
    const codigo = /<Code>([^<]*)<\/Code>/.exec(body)?.[1];
    const mensagem = /<Message>([^<]*)<\/Message>/.exec(body)?.[1];
    const detalhe = [codigo, mensagem].filter(Boolean).join(": ");
    return detalhe ? ` (${detalhe.slice(0, 300)})` : "";
}

class R2Storage implements ImageStorage {
    private readonly aws: AwsClient;
    private readonly endpoint: string;

    constructor(
        accountId: string,
        accessKey: string,
        secret: string,
        bucket: string,
        private readonly baseUrl: string,
    ) {
        this.aws = new AwsClient({
            accessKeyId: accessKey,
            secretAccessKey: secret,
            service: "s3",
            region: "auto",
            // O aws4fetch repete sozinho respostas 5xx ate 10 vezes, com espera
            // crescente: numa instabilidade do R2 o lojista ficaria minutos olhando o
            // botao girando. Duas novas tentativas cobrem o soluco rapido.
            retries: 2,
        });
        this.endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}`;
    }

    async upload(key: string, content: Buffer, tipo: string): Promise<void> {
        const response = await this.aws.fetch(`${this.endpoint}/${key}`, {
            method: "PUT",
            body: new Uint8Array(content),
            headers: { "Content-Type": tipo, "Cache-Control": IMMUTABLE_CACHE },
        });
        if (!response.ok) {
            throw new Error(`R2 recusou o envio de ${key}: HTTP ${response.status}${await r2Reason(response)}`);
        }
    }

    async apagar(key: string): Promise<void> {
        const response = await this.aws.fetch(`${this.endpoint}/${key}`, { method: "DELETE" });
        // 404 conta como apagado: o objetivo e o objeto nao existir.
        if (!response.ok && response.status !== 404) {
            throw new Error(`R2 recusou apagar ${key}: HTTP ${response.status}${await r2Reason(response)}`);
        }
    }

    publicUrl(key: string): string {
        return `${this.baseUrl}/${key}`;
    }

    keyFromUrl(url: string): string | null {
        const prefixo = `${this.baseUrl}/`;
        return url.startsWith(prefixo) ? url.slice(prefixo.length) : null;
    }
}

let current: ImageStorage | null | undefined;

/**
 * O armazenamento configurado, ou null se faltar variavel de ambiente — em
 * desenvolvimento, por exemplo. Sem ele o envio de foto responde 503 e o resto da
 * API segue funcionando.
 */
export function imageStorage(): ImageStorage | null {
    if (current !== undefined) return current;

    // trim: chave colada no terminal as vezes vem com espaco ou quebra de linha, e o
    // R2 responde 400 sem dizer que o problema e so esse.
    const [R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_IMAGENS, IMAGENS_URL_PUBLICA] = [
        process.env.R2_ACCOUNT_ID,
        process.env.R2_ACCESS_KEY_ID,
        process.env.R2_SECRET_ACCESS_KEY,
        process.env.R2_BUCKET_IMAGENS,
        process.env.IMAGENS_URL_PUBLICA,
    ].map((value) => value?.trim());
    current =
        R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_IMAGENS && IMAGENS_URL_PUBLICA
            ? new R2Storage(
                  R2_ACCOUNT_ID,
                  R2_ACCESS_KEY_ID,
                  R2_SECRET_ACCESS_KEY,
                  R2_BUCKET_IMAGENS,
                  IMAGENS_URL_PUBLICA.replace(/\/+$/, ""),
              )
            : null;
    return current;
}

/** Troca a implementacao. Uso exclusivo dos testes. */
export function setImageStorage(armazenamento: ImageStorage | null): void {
    current = armazenamento;
}
