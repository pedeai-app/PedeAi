import { Request, Response } from 'express';
import produtoService, { ProdutoFiltros } from "../services/produtoService";
import imagemProdutoService, { ErroImagemProduto, MotivoErroImagem } from "../services/imagemProdutoService";

const STATUS_ERRO_IMAGEM: Record<MotivoErroImagem, number> = {
    NAO_ENCONTRADO: 404,
    IMAGEM_INVALIDA: 422,
    SEM_ARMAZENAMENTO: 503,
};

function responderErroImagem(res: Response, error: unknown) {
    if (error instanceof ErroImagemProduto) {
        return res.status(STATUS_ERRO_IMAGEM[error.motivo]).json({ message: error.message });
    }
    // Falha do armazenamento (R2 fora, credencial errada): nao e culpa de quem enviou.
    console.error("Falha ao gravar a foto do produto:", error);
    return res.status(502).json({ message: "Não foi possível salvar a foto agora. Tente de novo em instantes." });
}
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

    // O catalogo do cliente pede so o que pode ser vendido. O admin nao manda
    // este parametro, porque precisa ver os inativos para conseguir reativa-los.
    if (query.disponivel === "true") {
        filtros.disponivel = true;
    }

    if (query.semImagem === "true") {
        filtros.semImagem = true;
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

    async definirImagem(req: Request, res: Response) {
        // Os dois tamanhos chegam como campos de um multipart (ver uploadImagemProduto).
        const arquivos = req.files as Record<string, Express.Multer.File[]> | undefined;
        try {
            const produto = await imagemProdutoService.definirImagem(Number(req.params.id), {
                grande: arquivos?.grande?.[0]?.buffer,
                miniatura: arquivos?.miniatura?.[0]?.buffer,
            });
            return res.status(200).json(produto);
        } catch (error) {
            return responderErroImagem(res, error);
        }
    }

    async removerImagem(req: Request, res: Response) {
        try {
            const produto = await imagemProdutoService.removerImagem(Number(req.params.id));
            return res.status(200).json(produto);
        } catch (error) {
            return responderErroImagem(res, error);
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