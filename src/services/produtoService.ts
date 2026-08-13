import { Op, WhereOptions } from 'sequelize';
import { Produto } from '../models/Produto';
import { Categoria } from '../models/Categoria';
import { PaginationParams } from '../utils/pagination';

const CAMPOS_PERMITIDOS = ["nome", "descricao", "preco", "estoque", "imagemUrl", "ativo", "categoriaId"] as const;

export interface ProdutoFiltros {
    q?: string;
    categoriaId?: number;
    ativo?: boolean;
}

class ProdutoService {

    async criarProduto(produtoData: {
        nome: string;
        descricao?: string;
        preco: number;
        estoque: number;
        imagemUrl?: string;
        ativo?: boolean;
        categoriaId?: number;
    }) {
        return await Produto.create(produtoData, {
            fields: [...CAMPOS_PERMITIDOS],
        });
    }
    async listarProdutos({ limit, offset }: PaginationParams, filtros: ProdutoFiltros = {}) {
        const where: WhereOptions = {};

        if (filtros.q) {
            Object.assign(where, {
                [Op.or]: [
                    { nome: { [Op.iLike]: `%${filtros.q}%` } },
                    { descricao: { [Op.iLike]: `%${filtros.q}%` } },
                ],
            });
        }
        if (filtros.categoriaId !== undefined) {
            Object.assign(where, { categoriaId: filtros.categoriaId });
        }
        if (filtros.ativo !== undefined) {
            Object.assign(where, { ativo: filtros.ativo });
        }

        return await Produto.findAndCountAll({
            where,
            include: [{ model: Categoria }],
            limit,
            offset,
            order: [["id", "ASC"]],
            distinct: true,
        });
    }
    async obterProdutoPorId(id: number) {
        return await Produto.findByPk(id);
    }

    async atualizarProduto(id: number,
        produtoData: {
            nome: string;
            descricao?: string;
            preco: number;
            estoque: number;
            imagemUrl?: string;
            ativo?: boolean;
            categoriaId?: number;
        }) {
        const produto = await Produto.findByPk(id);
        if (!produto) {
            throw new Error("Produto não encontrado."); 
        }
        return await produto.update(produtoData, {
            fields: [...CAMPOS_PERMITIDOS],
        });
    }

    async deletarProduto(id: number) {
        const produto = await Produto.findByPk(id);
        if (!produto) {
            throw new Error("Produto não encontrado.");
        }
        return await produto.destroy();
    }
}
export default new ProdutoService();


