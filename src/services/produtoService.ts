import { Op, WhereOptions } from 'sequelize';
import { Produto } from '../models/Produto';
import { Categoria } from '../models/Categoria';
import { PaginationParams } from '../utils/pagination';
import { FILTRO_DISPONIVEL } from './disponibilidadeProduto';
import imagemProdutoService from './imagemProdutoService';

const CAMPOS_PERMITIDOS = ["nome", "descricao", "preco", "estoque", "imagemUrl", "ativo", "categoriaId"] as const;

export interface ProdutoFiltros {
    q?: string;
    categoriaId?: number;
    ativo?: boolean;
    /** So o que pode ser vendido: produto ativo e categoria ativa (ou nenhuma). */
    disponivel?: boolean;
    /** So produto sem foto: a lista de trabalho de quem fotografa o catalogo. */
    semImagem?: boolean;
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
        if (filtros.semImagem) {
            condicoes.push({ [Op.or]: [{ imagemUrl: null }, { imagemUrl: '' }] });
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

        // URL da foto trocada a mao: a miniatura era da foto anterior e mostraria a
        // imagem errada nas listas. Sai junto, e os arquivos antigos saem do bucket.
        const trocouFoto = produtoData.imagemUrl !== undefined && produtoData.imagemUrl !== produto.imagemUrl;
        const antigas = [produto.imagemUrl, produto.imagemMiniaturaUrl];

        const atualizado = await produto.update(
            trocouFoto ? { ...produtoData, imagemMiniaturaUrl: null } : produtoData,
            { fields: trocouFoto ? [...CAMPOS_PERMITIDOS, "imagemMiniaturaUrl"] : [...CAMPOS_PERMITIDOS] },
        );
        if (trocouFoto) {
            await imagemProdutoService.apagarArquivos(antigas);
        }
        return atualizado;
    }

    async deletarProduto(id: number) {
        const produto = await Produto.findByPk(id);
        if (!produto) {
            throw new Error("Produto não encontrado.");
        }
        const antigas = [produto.imagemUrl, produto.imagemMiniaturaUrl];
        const resultado = await produto.destroy();
        await imagemProdutoService.apagarArquivos(antigas);
        return resultado;
    }
}
export default new ProdutoService();


