import { Op, WhereOptions } from 'sequelize';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { PaginationParams } from '../utils/pagination';
import { AVAILABLE_FILTER } from './productAvailability';
import productImageService from './productImageService';

const ALLOWED_FIELDS = ["name", "description", "price", "stock", "imageUrl", "active", "categoryId"] as const;

export interface ProductFilters {
    q?: string;
    categoryId?: number;
    active?: boolean;
    /** So o que pode ser vendido: produto ativo e categoria ativa (ou nenhuma). */
    available?: boolean;
    /** So produto sem foto: a lista de trabalho de quem fotografa o catalogo. */
    withoutImage?: boolean;
}

class ProductService {

    async createProduct(productData: {
        name: string;
        description?: string;
        price: number;
        stock: number;
        imageUrl?: string;
        active?: boolean;
        categoryId?: number;
    }) {
        return await Product.create(productData, {
            fields: [...ALLOWED_FIELDS],
        });
    }
    async listProducts({ limit, offset }: PaginationParams, filters: ProductFilters = {}) {
        // Condicoes acumuladas num AND, e nao com Object.assign: a busca e a
        // disponibilidade usam as duas um [Op.or], e a segunda sobrescreveria a
        // primeira em silencio — a busca pararia de filtrar sem erro nenhum.
        const conditions: WhereOptions[] = [];

        if (filters.q) {
            conditions.push({
                [Op.or]: [
                    { name: { [Op.iLike]: `%${filters.q}%` } },
                    { description: { [Op.iLike]: `%${filters.q}%` } },
                ],
            });
        }
        if (filters.categoryId !== undefined) {
            conditions.push({ categoryId: filters.categoryId });
        }
        if (filters.active !== undefined) {
            conditions.push({ active: filters.active });
        }
        if (filters.available) {
            conditions.push(AVAILABLE_FILTER);
        }
        if (filters.withoutImage) {
            conditions.push({ [Op.or]: [{ imageUrl: null }, { imageUrl: '' }] });
        }

        return await Product.findAndCountAll({
            where: { [Op.and]: conditions },
            include: [{ model: Category }],
            limit,
            offset,
            order: [["id", "ASC"]],
            distinct: true,
            // O filtro de disponibilidade le a coluna da categoria pelo alias do
            // include. Sem isto o Sequelize poe o limit numa subconsulta onde o
            // alias nao existe. A relacao e 1:1, entao nao ha linha duplicada.
            subQuery: false,
        });
    }
    // Com a categoria: o detalhe precisa dela para dizer ao cliente se o
    // produto pode ser comprado. Inativo continua sendo devolvido — o admin abre
    // pelo mesmo endpoint para editar e reativar.
    async getProductById(id: number) {
        return await Product.findByPk(id, { include: [{ model: Category }] });
    }

    async updateProduct(id: number,
        productData: {
            name: string;
            description?: string;
            price: number;
            stock: number;
            imageUrl?: string;
            active?: boolean;
            categoryId?: number;
        }) {
        const product = await Product.findByPk(id);
        if (!product) {
            throw new Error("Produto não encontrado."); 
        }

        // URL da foto trocada a mao: a miniatura era da foto anterior e mostraria a
        // imagem errada nas listas. Sai junto, e os arquivos antigos saem do bucket.
        const photoChanged = productData.imageUrl !== undefined && productData.imageUrl !== product.imageUrl;
        const oldUrls = [product.imageUrl, product.thumbnailUrl];

        const atualizado = await product.update(
            photoChanged ? { ...productData, thumbnailUrl: null } : productData,
            { fields: photoChanged ? [...ALLOWED_FIELDS, "thumbnailUrl"] : [...ALLOWED_FIELDS] },
        );
        if (photoChanged) {
            await productImageService.deleteFiles(oldUrls);
        }
        return atualizado;
    }

    async deleteProduct(id: number) {
        const product = await Product.findByPk(id);
        if (!product) {
            throw new Error("Produto não encontrado.");
        }
        const oldUrls = [product.imageUrl, product.thumbnailUrl];
        const result = await product.destroy();
        await productImageService.deleteFiles(oldUrls);
        return result;
    }
}
export default new ProductService();


