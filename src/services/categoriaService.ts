import { Categoria } from '../models/Categoria';
import { PaginationParams } from '../utils/pagination';

const CAMPOS_PERMITIDOS = ["nome", "ativo"] as const;

class CategoriaService {

    async criarCategoria(categoriaData: { nome: string; ativo?: boolean }) {
        return await Categoria.create(categoriaData, {
            fields: [...CAMPOS_PERMITIDOS],
        });
    }

    async listarCategorias({ limit, offset }: PaginationParams) {
        return await Categoria.findAndCountAll({
            limit,
            offset,
            order: [["nome", "ASC"]],
        });
    }

    async obterCategoriaPorId(id: number) {
        return await Categoria.findByPk(id);
    }

    async atualizarCategoria(id: number, categoriaData: { nome?: string; ativo?: boolean }) {
        const categoria = await Categoria.findByPk(id);
        if (!categoria) {
            throw new Error("Categoria não encontrada.");
        }
        return await categoria.update(categoriaData, {
            fields: [...CAMPOS_PERMITIDOS],
        });
    }

    async deletarCategoria(id: number) {
        const categoria = await Categoria.findByPk(id);
        if (!categoria) {
            throw new Error("Categoria não encontrada.");
        }
        return await categoria.destroy();
    }
}
export default new CategoriaService();
