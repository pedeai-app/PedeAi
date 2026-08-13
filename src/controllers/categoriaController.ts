import { Request, Response } from 'express';
import categoriaService from "../services/categoriaService";
import { getPaginationParams, buildPaginatedResult } from "../utils/pagination";

class CategoriaController {
    async criarCategoria(req: Request, res: Response) {
        try {
            const categoria = await categoriaService.criarCategoria(req.body);
            return res.status(201).json(categoria);
        } catch (error: any) {
            return res.status(400).json({ message: error.message });
        }
    }

    async listarCategorias(req: Request, res: Response) {
        const { page, limit, offset } = getPaginationParams(req.query);
        const { rows, count } = await categoriaService.listarCategorias({ page, limit, offset });
        return res.status(200).json(buildPaginatedResult(rows, count, page, limit));
    }

    async obterCategoriaPorId(req: Request, res: Response) {
        const { id } = req.params;
        const categoria = await categoriaService.obterCategoriaPorId(Number(id));

        if (!categoria) {
            return res.status(404).json({ message: 'Categoria não encontrada' });
        }

        return res.status(200).json(categoria);
    }

    async atualizarCategoria(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const categoria = await categoriaService.atualizarCategoria(Number(id), req.body);
            return res.status(200).json(categoria);
        } catch (error: any) {
            return res.status(400).json({ message: error.message });
        }
    }

    async deletarCategoria(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await categoriaService.deletarCategoria(Number(id));
            return res.status(204).send();
        } catch (error: any) {
            return res.status(404).json({ message: error.message });
        }
    }
}

export default new CategoriaController();
