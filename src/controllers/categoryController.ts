import { Request, Response } from 'express';
import categoryService from "../services/categoryService";
import { getPaginationParams, buildPaginatedResult } from "../utils/pagination";

class CategoryController {
    async createCategory(req: Request, res: Response) {
        try {
            const category = await categoryService.createCategory(req.body);
            return res.status(201).json(category);
        } catch (error: any) {
            return res.status(400).json({ message: error.message });
        }
    }

    async listCategories(req: Request, res: Response) {
        const { page, limit, offset } = getPaginationParams(req.query);
        const { rows, count } = await categoryService.listCategories({ page, limit, offset });
        return res.status(200).json(buildPaginatedResult(rows, count, page, limit));
    }

    async getCategoryById(req: Request, res: Response) {
        const { id } = req.params;
        const category = await categoryService.getCategoryById(Number(id));

        if (!category) {
            return res.status(404).json({ message: 'Categoria não encontrada' });
        }

        return res.status(200).json(category);
    }

    async updateCategory(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const category = await categoryService.updateCategory(Number(id), req.body);
            return res.status(200).json(category);
        } catch (error: any) {
            return res.status(400).json({ message: error.message });
        }
    }

    async deleteCategory(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await categoryService.deleteCategory(Number(id));
            return res.status(204).send();
        } catch (error: any) {
            return res.status(404).json({ message: error.message });
        }
    }
}

export default new CategoryController();
