import { Op, WhereOptions } from 'sequelize';
import { Produto } from '../models/Produto';
import { Categoria } from '../models/Categoria';
import { PaginationParams } from '../utils/pagination';
import { FILTRO_DISPONIVEL } from './disponibilidadeProduto';

const CAMPOS_PERMITIDOS = ["nome", "descricao", "preco", "estoque", "imagemUrl", "ativo", "categoriaId"] as const;

export interface ProdutoFiltros {
    q?: string;
    categoriaId?: number;
    ativo?: boolean;
    /** So o que pode ser vendido: produto ativo e categoria ativa (ou nenhuma). */
    disponivel?: boolean;
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
        // Condicoes acumuladas num AND, e nao com Object.assign: a busca e a
        // disponibilidade usam as duas um [Op.or], e a segunda sobrescreveria a
        // primeira em silencio — a busca pararia de filtrar sem erro nenhum.
        const condicoes: WhereOptions[] = [];

        if (filtros.q) {
            condicoes.push({
                [Op.or]: [
                    { nome: { [Op.iLike]: `%${filtros.q}%` } },
                    { descricao: { [Op.iLike]: `%${filtros.q}%` } },
                ],
            });
        }
        if (filtros.categoriaId !== undefined) {
            condicoes.push({ categoriaId: filtros.categoriaId });
        }
        if (filtros.ativo !== undefined) {
            condicoes.push({ ativo: filtros.ativo });
        }
        if (filtros.disponivel) {
            condicoes.push(FILTRO_DISPONIVEL);
        }

        return await Produto.findAndCountAll({
            where: { [Op.and]: condicoes },
            include: [{ model: Categoria }],
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
    async obterProdutoPorId(id: number) {
        return await Produto.findByPk(id, { include: [{ model: Categoria }] });
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


