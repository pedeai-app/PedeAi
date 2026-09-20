import { randomBytes } from "crypto";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { jpegDimensions } from "../utils/jpegDimensions";
import { imageStorage, ImageStorage } from "./imageStorage";

/**
 * Motivo da falha, para o controller escolher o status. O service nao conhece
 * HTTP; ele so diz o que deu errado.
 */
export type ImageErrorReason = "NOT_FOUND" | "INVALID_IMAGE" | "NO_STORAGE";

export class ProductImageError extends Error {
    constructor(readonly reason: ImageErrorReason, mensagem: string) {
        super(mensagem);
    }
}

/**
 * Limites de cada tamanho. O front manda 800x800 e 160x160; os intervalos dao
 * folga para mudar isso no front sem quebrar o servidor, e barram o que claramente
 * nao saiu de la (uma foto crua do celular tem 4000px e varios MB).
 */
export const LIMITS = {
    grande: { minLado: 400, maxLado: 1200, maxBytes: 600 * 1024 },
    miniatura: { minLado: 100, maxLado: 320, maxBytes: 100 * 1024 },
} as const;

export type ImageSize = keyof typeof LIMITS;

function validar(size: ImageSize, file: Buffer | undefined): Buffer {
    const name = size === "grande" ? "A foto grande" : "A miniatura";
    const limit = LIMITS[size];

    if (!file || file.length === 0) {
        throw new ProductImageError("INVALID_IMAGE", `${name} não foi enviada.`);
    }
    if (file.length > limit.maxBytes) {
        throw new ProductImageError("INVALID_IMAGE", `${name} passa de ${limit.maxBytes / 1024} KB.`);
    }
    const dimensoes = jpegDimensions(file);
    if (!dimensoes) {
        throw new ProductImageError("INVALID_IMAGE", `${name} precisa ser um JPEG.`);
    }
    if (dimensoes.width !== dimensoes.height) {
        throw new ProductImageError("INVALID_IMAGE", `${name} precisa ser quadrada.`);
    }
    if (dimensoes.width < limit.minLado || dimensoes.width > limit.maxLado) {
        throw new ProductImageError(
            "INVALID_IMAGE",
            `${name} precisa ter entre ${limit.minLado} e ${limit.maxLado} px de lado.`,
        );
    }
    return file;
}

/**
 * Apaga os objetos que eram deste armazenamento. Falha aqui nao desfaz nada: a
 * foto nova ja esta gravada e o produto ja aponta para ela, e um arquivo orfao de
 * 100 KB e muito melhor que um produto sem foto.
 */
async function deleteOldFiles(armazenamento: ImageStorage | null, urls: (string | null | undefined)[]) {
    if (!armazenamento) return;
    for (const url of urls) {
        const key = url ? armazenamento.keyFromUrl(url) : null;
        if (!key) continue;
        try {
            await armazenamento.apagar(key);
        } catch (error) {
            console.error(`Nao foi possivel apagar a imagem antiga ${key}:`, error);
        }
    }
}

class ProductImageService {
    async setImage(productId: number, files: { grande?: Buffer; miniatura?: Buffer }) {
        const armazenamento = imageStorage();
        if (!armazenamento) {
            throw new ProductImageError("NO_STORAGE", "O envio de fotos não está configurado neste ambiente.");
        }

        const product = await Product.findByPk(productId);
        if (!product) {
            throw new ProductImageError("NOT_FOUND", "Produto não encontrado.");
        }

        const grande = validar("grande", files.grande);
        const miniatura = validar("miniatura", files.miniatura);

        // Chave nova a cada envio, e nao produtos/<id>.jpg: a URL muda quando a
        // foto muda, e o cache de um ano da borda e do navegador nunca mostra a
        // foto velha.
        const version = randomBytes(6).toString("hex");
        const largeKey = `produtos/${product.id}/${version}-800.jpg`;
        const thumbKey = `produtos/${product.id}/${version}-160.jpg`;

        await armazenamento.upload(largeKey, grande, "image/jpeg");
        await armazenamento.upload(thumbKey, miniatura, "image/jpeg");

        const oldUrls = [product.imageUrl, product.thumbnailUrl];
        try {
            await product.update(
                {
                    imageUrl: armazenamento.publicUrl(largeKey),
                    thumbnailUrl: armazenamento.publicUrl(thumbKey),
                },
                { fields: ["imageUrl", "thumbnailUrl"] },
            );
        } catch (error) {
            // O banco nao gravou: as fotos novas ficariam orfas no bucket.
            await deleteOldFiles(armazenamento, [
                armazenamento.publicUrl(largeKey),
                armazenamento.publicUrl(thumbKey),
            ]);
            throw error;
        }

        await deleteOldFiles(armazenamento, oldUrls);
        return Product.findByPk(product.id, { include: [{ model: Category }] });
    }

    /** Tira a foto do produto. Funciona mesmo sem armazenamento configurado. */
    async removeImage(productId: number) {
        const product = await Product.findByPk(productId);
        if (!product) {
            throw new ProductImageError("NOT_FOUND", "Produto não encontrado.");
        }

        const oldUrls = [product.imageUrl, product.thumbnailUrl];
        await product.update({ imageUrl: null, thumbnailUrl: null }, { fields: ["imageUrl", "thumbnailUrl"] });
        await deleteOldFiles(imageStorage(), oldUrls);
        return Product.findByPk(product.id, { include: [{ model: Category }] });
    }

    /** Usado quando a URL da foto e trocada a mao ou o produto e excluido. */
    async deleteFiles(urls: (string | null | undefined)[]) {
        await deleteOldFiles(imageStorage(), urls);
    }
}

export default new ProductImageService();
