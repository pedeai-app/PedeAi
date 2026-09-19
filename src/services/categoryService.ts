import { Category } from '../models/Category';
import { PaginationParams } from '../utils/pagination';

const CAMPOS_PERMITIDOS = ["nome", "ativo"] as const;

class CategoryService {

    async createCategory(categoryData: { nome: string; ativo?: boolean }) {
        return await Category.create(categoryData, {
            fields: [...CAMPOS_PERMITIDOS],
        });
    }

    async listCategories({ limit, offset }: PaginationParams) {
        return await Category.findAndCountAll({
            limit,
            offset,
            order: [["nome", "ASC"]],
        });
    }

    async getCategoryById(id: number) {
        return await Category.findByPk(id);
    }

    async updateCategory(id: number, categoryData: { nome?: string; ativo?: boolean }) {
        const category = await Category.findByPk(id);
        if (!category) {
            throw new Error("Categoria não encontrada.");
        }
        return await category.update(categoryData, {
            fields: [...CAMPOS_PERMITIDOS],
        });
    }

    async deleteCategory(id: number) {
        const category = await Category.findByPk(id);
        if (!category) {
            throw new Error("Categoria não encontrada.");
        }
        return await category.destroy();
    }
}
export default new CategoryService();
