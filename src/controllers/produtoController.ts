import { Request, Response } from 'express';
import produtoService, { ProdutoFiltros } from "../services/produtoService";
import { getPaginationParams, buildPaginatedResult } from "../utils/pagination";

// Le os filtros de busca da query string. Parametros ausentes/invalidos
// simplesmente nao entram no filtro (listagem sem restricao).
function getProdutoFiltros(query: Request["query"]): ProdutoFiltros {
    const filtros: ProdutoFiltros = {};

    if (typeof query.q === "string" && query.q.trim() !== "") {
        filtros.q = query.q.trim();
    }

    const categoriaId = Number(query.categoriaId);
    if (Number.isInteger(categoriaId) && categoriaId > 0) {
        filtros.categoriaId = categoriaId;
    }

    if (query.ativo === "true") {
        filtros.ativo = true;
    } else if (query.ativo === "false") {
        filtros.ativo = false;
    }

    return filtros;
}


class ProdutoController {
    async criarProduto(req: Request, res: Response) {
        try {
            const produtoData = await produtoService.criarProduto(req.body);

            return res.status(201).json(produtoData);
        } catch (error: any) {
            return res.status(400).json({ 
                message: error.message 
            });
        }   
    }
    async listarProdutos(req: Request, res: Response) {
        const { page, limit, offset } = getPaginationParams(req.query);
        const filtros = getProdutoFiltros(req.query);
        const { rows, count } = await produtoService.listarProdutos({ page, limit, offset }, filtros);
        return res.status(200).json(buildPaginatedResult(rows, count, page, limit));
    }

    async obterProdutoPorId(req: Request, res: Response) {
        const { id } = req.params;
        const produto = await produtoService.obterProdutoPorId(Number(id));

        if (!produto) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        return res.status(200).json(produto);
    }

    async atualizarProduto(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const produtoData = await produtoService.atualizarProduto(Number(id), req.body);

            return res.status(200).json(produtoData);
        } catch (error: any) {
            return res.status(400).json({ message: error.message });
        }
    }

    async deletarProduto(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await produtoService.deletarProduto(Number(id));
            return res.status(204).send();
        } catch (error: any) {
            return res.status(404).json({ message: error.message });
        }
    }

}


export default new ProdutoController();