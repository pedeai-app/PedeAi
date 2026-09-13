import { randomBytes } from "crypto";
import { Produto } from "../models/Produto";
import { Categoria } from "../models/Categoria";
import { dimensoesJpeg } from "../utils/dimensoesJpeg";
import { armazenamentoImagens, ArmazenamentoImagens } from "./armazenamentoImagens";

/**
 * Motivo da falha, para o controller escolher o status. O service nao conhece
 * HTTP; ele so diz o que deu errado.
 */
export type MotivoErroImagem = "NAO_ENCONTRADO" | "IMAGEM_INVALIDA" | "SEM_ARMAZENAMENTO";

export class ErroImagemProduto extends Error {
    constructor(readonly motivo: MotivoErroImagem, mensagem: string) {
        super(mensagem);
    }
}

/**
 * Limites de cada tamanho. O front manda 800x800 e 160x160; os intervalos dao
 * folga para mudar isso no front sem quebrar o servidor, e barram o que claramente
 * nao saiu de la (uma foto crua do celular tem 4000px e varios MB).
 */
export const LIMITES = {
    grande: { minLado: 400, maxLado: 1200, maxBytes: 600 * 1024 },
    miniatura: { minLado: 100, maxLado: 320, maxBytes: 100 * 1024 },
} as const;

export type TamanhoImagem = keyof typeof LIMITES;

function validar(tamanho: TamanhoImagem, arquivo: Buffer | undefined): Buffer {
    const nome = tamanho === "grande" ? "A foto grande" : "A miniatura";
    const limite = LIMITES[tamanho];

    if (!arquivo || arquivo.length === 0) {
        throw new ErroImagemProduto("IMAGEM_INVALIDA", `${nome} não foi enviada.`);
    }
    if (arquivo.length > limite.maxBytes) {
        throw new ErroImagemProduto("IMAGEM_INVALIDA", `${nome} passa de ${limite.maxBytes / 1024} KB.`);
    }
    const dimensoes = dimensoesJpeg(arquivo);
    if (!dimensoes) {
        throw new ErroImagemProduto("IMAGEM_INVALIDA", `${nome} precisa ser um JPEG.`);
    }
    if (dimensoes.largura !== dimensoes.altura) {
        throw new ErroImagemProduto("IMAGEM_INVALIDA", `${nome} precisa ser quadrada.`);
    }
    if (dimensoes.largura < limite.minLado || dimensoes.largura > limite.maxLado) {
        throw new ErroImagemProduto(
            "IMAGEM_INVALIDA",
            `${nome} precisa ter entre ${limite.minLado} e ${limite.maxLado} px de lado.`,
        );
    }
    return arquivo;
}

/**
 * Apaga os objetos que eram deste armazenamento. Falha aqui nao desfaz nada: a
 * foto nova ja esta gravada e o produto ja aponta para ela, e um arquivo orfao de
 * 100 KB e muito melhor que um produto sem foto.
 */
async function apagarAntigas(armazenamento: ArmazenamentoImagens | null, urls: (string | null | undefined)[]) {
    if (!armazenamento) return;
    for (const url of urls) {
        const chave = url ? armazenamento.chaveDaUrl(url) : null;
        if (!chave) continue;
        try {
            await armazenamento.apagar(chave);
        } catch (erro) {
            console.error(`Nao foi possivel apagar a imagem antiga ${chave}:`, erro);
        }
    }
}

class ImagemProdutoService {
    async definirImagem(produtoId: number, arquivos: { grande?: Buffer; miniatura?: Buffer }) {
        const armazenamento = armazenamentoImagens();
        if (!armazenamento) {
            throw new ErroImagemProduto("SEM_ARMAZENAMENTO", "O envio de fotos não está configurado neste ambiente.");
        }

        const produto = await Produto.findByPk(produtoId);
        if (!produto) {
            throw new ErroImagemProduto("NAO_ENCONTRADO", "Produto não encontrado.");
        }

        const grande = validar("grande", arquivos.grande);
        const miniatura = validar("miniatura", arquivos.miniatura);

        // Chave nova a cada envio, e nao produtos/<id>.jpg: a URL muda quando a
        // foto muda, e o cache de um ano da borda e do navegador nunca mostra a
        // foto velha.
        const versao = randomBytes(6).toString("hex");
        const chaveGrande = `produtos/${produto.id}/${versao}-800.jpg`;
        const chaveMiniatura = `produtos/${produto.id}/${versao}-160.jpg`;

        await armazenamento.enviar(chaveGrande, grande, "image/jpeg");
        await armazenamento.enviar(chaveMiniatura, miniatura, "image/jpeg");

        const antigas = [produto.imagemUrl, produto.imagemMiniaturaUrl];
        try {
            await produto.update(
                {
                    imagemUrl: armazenamento.urlPublica(chaveGrande),
                    imagemMiniaturaUrl: armazenamento.urlPublica(chaveMiniatura),
                },
                { fields: ["imagemUrl", "imagemMiniaturaUrl"] },
            );
        } catch (erro) {
            // O banco nao gravou: as fotos novas ficariam orfas no bucket.
            await apagarAntigas(armazenamento, [
                armazenamento.urlPublica(chaveGrande),
                armazenamento.urlPublica(chaveMiniatura),
            ]);
            throw erro;
        }

        await apagarAntigas(armazenamento, antigas);
        return Produto.findByPk(produto.id, { include: [{ model: Categoria }] });
    }

    /** Tira a foto do produto. Funciona mesmo sem armazenamento configurado. */
    async removerImagem(produtoId: number) {
        const produto = await Produto.findByPk(produtoId);
        if (!produto) {
            throw new ErroImagemProduto("NAO_ENCONTRADO", "Produto não encontrado.");
        }

        const antigas = [produto.imagemUrl, produto.imagemMiniaturaUrl];
        await produto.update({ imagemUrl: null, imagemMiniaturaUrl: null }, { fields: ["imagemUrl", "imagemMiniaturaUrl"] });
        await apagarAntigas(armazenamentoImagens(), antigas);
        return Produto.findByPk(produto.id, { include: [{ model: Categoria }] });
    }

    /** Usado quando a URL da foto e trocada a mao ou o produto e excluido. */
    async apagarArquivos(urls: (string | null | undefined)[]) {
        await apagarAntigas(armazenamentoImagens(), urls);
    }
}

export default new ImagemProdutoService();
