import { Op, WhereOptions } from "sequelize";
import { Produto } from "../models/Produto";
import { Categoria } from "../models/Categoria";

/**
 * Quando um produto pode ser vendido.
 *
 * O admin tem dois interruptores que prometem "visivel no catalogo": um no
 * produto, outro na categoria. Ate aqui nenhum dos dois tinha efeito para o
 * cliente — o catalogo listava inativo, o carrinho aceitava e o pedido fechava.
 * Desativar uma categoria so escondia o chip; os produtos dela seguiam a venda.
 *
 * A regra mora num lugar so porque e aplicada em tres (listagem, carrinho e
 * fechamento do pedido), e tres copias dela divergiriam na primeira mudanca.
 *
 * Produto sem categoria conta como disponivel: categoria e opcional no cadastro,
 * e nao ter uma nao e motivo para sumir do catalogo.
 */
export function produtoDisponivel(produto: Produto, categoria: Categoria | null | undefined): boolean {
    if (!produto.ativo) {
        return false;
    }
    if (produto.categoriaId === null || produto.categoriaId === undefined) {
        return true;
    }
    return categoria?.ativo === true;
}

/**
 * A mesma regra, em forma de filtro para a listagem.
 *
 * Referencia a coluna da categoria pelo alias do include (`$categoria.ativo$`),
 * entao so vale numa consulta que inclua Categoria — e com `subQuery: false`,
 * senao o Sequelize empurra o limit para uma subconsulta onde o alias nao existe.
 */
export const FILTRO_DISPONIVEL: WhereOptions = {
    ativo: true,
    [Op.or]: [
        { categoriaId: null },
        { "$categoria.ativo$": true },
    ],
};
