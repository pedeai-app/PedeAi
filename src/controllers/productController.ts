import { Request, Response } from 'express';
import productService, { ProductFilters } from "../services/productService";
import productImageService, { ProductImageError, ImageErrorReason } from "../services/productImageService";

const IMAGE_ERROR_STATUS: Record<ImageErrorReason, number> = {
    NOT_FOUND: 404,
    INVALID_IMAGE: 422,
    NO_STORAGE: 503,
};

function respondImageError(res: Response, error: unknown) {
    if (error instanceof ProductImageError) {
        return res.status(IMAGE_ERROR_STATUS[error.reason]).json({ message: error.message });
    }
    // Falha do armazenamento (R2 fora, credencial errada): nao e culpa de quem enviou.
    console.error("Falha ao gravar a foto do produto:", error);
    return res.status(502).json({ message: "Não foi possível salvar a foto agora. Tente de novo em instantes." });
}
import { getPaginationParams, buildPaginatedResult } from "../utils/pagination";

// Le os filtros de busca da query string. Parametros ausentes/invalidos
// simplesmente nao entram no filtro (listagem sem restricao).
function getProductFilters(query: Request["query"]): ProductFilters {
    const filters: ProductFilters = {};

    if (typeof query.q === "string" && query.q.trim() !== "") {
        filters.q = query.q.trim();
    }

    const categoryId = Number(query.categoryId);
    if (Number.isInteger(categoryId) && categoryId > 0) {
        filters.categoryId = categoryId;
    }

    if (query.active === "true") {
        filters.active = true;
    } else if (query.active === "false") {
        filters.active = false;
    }

    // O catalogo do cliente pede so o que pode ser vendido. O admin nao manda
    // este parametro, porque precisa ver os inativos para conseguir reativa-los.
    if (query.available === "true") {
        filters.available = true;
    }

    if (query.withoutImage === "true") {
        filters.withoutImage = true;
    }

    return filters;
}


class ProductController {
    async createProduct(req: Request, res: Response) {
        try {
            const productData = await productService.createProduct(req.body);

            return res.status(201).json(productData);
        } catch (error: any) {
            return res.status(400).json({ 
                message: error.message 
            });
        }   
    }
    async listProducts(req: Request, res: Response) {
        const { page, limit, offset } = getPaginationParams(req.query);
        const filters = getProductFilters(req.query);
        const { rows, count } = await productService.listProducts({ page, limit, offset }, filters);
        return res.status(200).json(buildPaginatedResult(rows, count, page, limit));
    }

    async getProductById(req: Request, res: Response) {
        const { id } = req.params;
        const product = await productService.getProductById(Number(id));

        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        return res.status(200).json(product);
    }

    async updateProduct(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const productData = await productService.updateProduct(Number(id), req.body);

            return res.status(200).json(productData);
        } catch (error: any) {
            return res.status(400).json({ message: error.message });
        }
    }

    async setImage(req: Request, res: Response) {
        // Os dois tamanhos chegam como campos de um multipart (ver uploadImagemProduto).
        const files = req.files as Record<string, Express.Multer.File[]> | undefined;
        try {
            const product = await productImageService.setImage(Number(req.params.id), {
                grande: files?.grande?.[0]?.buffer,
                miniatura: files?.miniatura?.[0]?.buffer,
            });
            return res.status(200).json(product);
        } catch (error) {
            return respondImageError(res, error);
        }
    }

    async removeImage(req: Request, res: Response) {
        try {
            const product = await productImageService.removeImage(Number(req.params.id));
            return res.status(200).json(product);
        } catch (error) {
            return respondImageError(res, error);
        }
    }

    async deleteProduct(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await productService.deleteProduct(Number(id));
            return res.status(204).send();
        } catch (error: any) {
            return res.status(404).json({ message: error.message });
        }
    }

}


export default new ProductController();