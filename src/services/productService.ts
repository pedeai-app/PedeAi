import { Op, WhereOptions } from 'sequelize';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { PaginationParams } from '../utils/pagination';
import { AVAILABLE_FILTER } from './productAvailability';
import productImageService from './productImageService';

const CAMPOS_PERMITIDOS = ["nome", "descricao", "preco", "estoque", "imagemUrl", "ativo", "categoriaId"] as const;

export interface ProductFilters {
    q?: string;
    categoriaId?: number;
    ativo?: boolean;
    /** So o que pode ser vendido: produto ativo e categoria ativa (ou nenhuma). */
    disponivel?: boolean;
    /** So produto sem foto: a lista de trabalho de quem fotografa o catalogo. */
    semImagem?: boolean;
}

class ProductService {

    async createProduct(productData: {
        nome: string;
        descricao?: string;
        preco: number;
        estoque: number;
        imagemUrl?: string;
        ativo?: boolean;
        categoriaId?: number;
    }) {
        return await Product.create(productData, {
            fields: [...CAMPOS_PERMITIDOS],
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
                    { nome: { [Op.iLike]: `%${filters.q}%` } },
                    { descricao: { [Op.iLike]: `%${filters.q}%` } },
                ],
            });
        }
        if (filters.categoriaId !== undefined) {
            conditions.push({ categoriaId: filters.categoriaId });
        }
        if (filters.ativo !== undefined) {
            conditions.push({ ativo: filters.ativo });
        }
        if (filters.disponivel) {
            conditions.push(AVAILABLE_FILTER);
        }
        if (filters.semImagem) {
            conditions.push({ [Op.or]: [{ imagemUrl: null }, { imagemUrl: '' }] });
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
            nome: string;
            descricao?: string;
            preco: number;
            estoque: number;
            imagemUrl?: string;
            ativo?: boolean;
            categoriaId?: number;
        }) {
        const product = await Product.findByPk(id);
        if (!product) {
            throw new Error("Produto não encontrado."); 
        }

        // URL da foto trocada a mao: a miniatura era da foto anterior e mostraria a
        // imagem errada nas listas. Sai junto, e os arquivos antigos saem do bucket.
        const photoChanged = productData.imagemUrl !== undefined && productData.imagemUrl !== product.imagemUrl;
        const oldUrls = [product.imagemUrl, product.imagemMiniaturaUrl];

        const atualizado = await product.update(
            photoChanged ? { ...productData, imagemMiniaturaUrl: null } : productData,
            { fields: photoChanged ? [...CAMPOS_PERMITIDOS, "imagemMiniaturaUrl"] : [...CAMPOS_PERMITIDOS] },
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
        const oldUrls = [product.imagemUrl, product.imagemMiniaturaUrl];
        const result = await product.destroy();
        await productImageService.deleteFiles(oldUrls);
        return result;
    }
}
export default new ProductService();


