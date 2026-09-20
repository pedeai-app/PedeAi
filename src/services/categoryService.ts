import { Category } from '../models/Category';
import { PaginationParams } from '../utils/pagination';

const ALLOWED_FIELDS = ["name", "active"] as const;

class CategoryService {

    async createCategory(categoryData: { name: string; active?: boolean }) {
        return await Category.create(categoryData, {
            fields: [...ALLOWED_FIELDS],
        });
    }

    async listCategories({ limit, offset }: PaginationParams) {
        return await Category.findAndCountAll({
            limit,
            offset,
            order: [["name", "ASC"]],
        });
    }

    async getCategoryById(id: number) {
        return await Category.findByPk(id);
    }

    async updateCategory(id: number, categoryData: { name?: string; active?: boolean }) {
        const category = await Category.findByPk(id);
        if (!category) {
            throw new Error("Categoria não encontrada.");
        }
        return await category.update(categoryData, {
            fields: [...ALLOWED_FIELDS],
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
