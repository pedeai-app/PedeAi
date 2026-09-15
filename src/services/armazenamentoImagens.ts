import { AwsClient } from "aws4fetch";

/**
 * Onde ficam as fotos dos produtos.
 *
 * Interface porque ha duas implementacoes de verdade: o R2 da Cloudflare em
 * producao e uma em memoria nos testes — sem ela, a suite de integracao gravaria
 * no bucket real a cada rodada.
 */
export interface ArmazenamentoImagens {
    enviar(chave: string, conteudo: Buffer, tipo: string): Promise<void>;
    apagar(chave: string): Promise<void>;
    urlPublica(chave: string): string;
    /** A chave do objeto, se a URL for deste armazenamento; null para URL de fora. */
    chaveDaUrl(url: string): string | null;
}

// Chaves sao unicas por envio (ver imagemProdutoService), entao o conteudo de uma
// URL nunca muda: a borda e o navegador podem guardar por um ano.
const CACHE_IMUTAVEL = "public, max-age=31536000, immutable";

/**
 * O motivo que o R2 devolve no corpo do erro (XML da API S3), para o log dizer por
 * que falhou e nao so o status. Sem isto um 400 nao diferencia "chave de acesso
 * colada errada" de "requisicao mal montada". O corpo nunca traz a chave secreta.
 */
async function motivoDoR2(resposta: Response): Promise<string> {
    const corpo = await resposta.text().catch(() => "");
    const codigo = /<Code>([^<]*)<\/Code>/.exec(corpo)?.[1];
    const mensagem = /<Message>([^<]*)<\/Message>/.exec(corpo)?.[1];
    const detalhe = [codigo, mensagem].filter(Boolean).join(": ");
    return detalhe ? ` (${detalhe.slice(0, 300)})` : "";
}

class ArmazenamentoR2 implements ArmazenamentoImagens {
    private readonly aws: AwsClient;
    private readonly endpoint: string;

    constructor(
        contaId: string,
        chaveAcesso: string,
        segredo: string,
        bucket: string,
        private readonly urlBase: string,
    ) {
        this.aws = new AwsClient({
            accessKeyId: chaveAcesso,
            secretAccessKey: segredo,
            service: "s3",
            region: "auto",
            // O aws4fetch repete sozinho respostas 5xx ate 10 vezes, com espera
            // crescente: numa instabilidade do R2 o lojista ficaria minutos olhando o
            // botao girando. Duas novas tentativas cobrem o soluco rapido.
            retries: 2,
        });
        this.endpoint = `https://${contaId}.r2.cloudflarestorage.com/${bucket}`;
    }

    async enviar(chave: string, conteudo: Buffer, tipo: string): Promise<void> {
        const resposta = await this.aws.fetch(`${this.endpoint}/${chave}`, {
            method: "PUT",
            body: new Uint8Array(conteudo),
            headers: { "Content-Type": tipo, "Cache-Control": CACHE_IMUTAVEL },
        });
        if (!resposta.ok) {
            throw new Error(`R2 recusou o envio de ${chave}: HTTP ${resposta.status}${await motivoDoR2(resposta)}`);
        }
    }

    async apagar(chave: string): Promise<void> {
        const resposta = await this.aws.fetch(`${this.endpoint}/${chave}`, { method: "DELETE" });
        // 404 conta como apagado: o objetivo e o objeto nao existir.
        if (!resposta.ok && resposta.status !== 404) {
            throw new Error(`R2 recusou apagar ${chave}: HTTP ${resposta.status}${await motivoDoR2(resposta)}`);
        }
    }

    urlPublica(chave: string): string {
        return `${this.urlBase}/${chave}`;
    }

    chaveDaUrl(url: string): string | null {
        const prefixo = `${this.urlBase}/`;
        return url.startsWith(prefixo) ? url.slice(prefixo.length) : null;
    }
}

let atual: ArmazenamentoImagens | null | undefined;

/**
 * O armazenamento configurado, ou null se faltar variavel de ambiente — em
 * desenvolvimento, por exemplo. Sem ele o envio de foto responde 503 e o resto da
 * API segue funcionando.
 */
export function armazenamentoImagens(): ArmazenamentoImagens | null {
    if (atual !== undefined) return atual;

    // trim: chave colada no terminal as vezes vem com espaco ou quebra de linha, e o
    // R2 responde 400 sem dizer que o problema e so esse.
    const [R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_IMAGENS, IMAGENS_URL_PUBLICA] = [
        process.env.R2_ACCOUNT_ID,
        process.env.R2_ACCESS_KEY_ID,
        process.env.R2_SECRET_ACCESS_KEY,
        process.env.R2_BUCKET_IMAGENS,
        process.env.IMAGENS_URL_PUBLICA,
    ].map((valor) => valor?.trim());
    atual =
        R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_IMAGENS && IMAGENS_URL_PUBLICA
            ? new ArmazenamentoR2(
                  R2_ACCOUNT_ID,
                  R2_ACCESS_KEY_ID,
                  R2_SECRET_ACCESS_KEY,
                  R2_BUCKET_IMAGENS,
                  IMAGENS_URL_PUBLICA.replace(/\/+$/, ""),
              )
            : null;
    return atual;
}

/** Troca a implementacao. Uso exclusivo dos testes. */
export function definirArmazenamentoImagens(armazenamento: ArmazenamentoImagens | null): void {
    atual = armazenamento;
}
