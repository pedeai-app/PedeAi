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
        this.aws = new AwsClient({ accessKeyId: chaveAcesso, secretAccessKey: segredo, service: "s3", region: "auto" });
        this.endpoint = `https://${contaId}.r2.cloudflarestorage.com/${bucket}`;
    }

    async enviar(chave: string, conteudo: Buffer, tipo: string): Promise<void> {
        const resposta = await this.aws.fetch(`${this.endpoint}/${chave}`, {
            method: "PUT",
            body: new Uint8Array(conteudo),
            headers: { "Content-Type": tipo, "Cache-Control": CACHE_IMUTAVEL },
        });
        if (!resposta.ok) {
            throw new Error(`R2 recusou o envio de ${chave}: HTTP ${resposta.status}`);
        }
    }

    async apagar(chave: string): Promise<void> {
        const resposta = await this.aws.fetch(`${this.endpoint}/${chave}`, { method: "DELETE" });
        // 404 conta como apagado: o objetivo e o objeto nao existir.
        if (!resposta.ok && resposta.status !== 404) {
            throw new Error(`R2 recusou apagar ${chave}: HTTP ${resposta.status}`);
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

    const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_IMAGENS, IMAGENS_URL_PUBLICA } = process.env;
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
