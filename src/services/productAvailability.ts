import { Op, WhereOptions } from "sequelize";
import { Product } from "../models/Product";
import { Category } from "../models/Category";

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
export function isProductAvailable(product: Product, category: Category | null | undefined): boolean {
    if (!product.active) {
        return false;
    }
    if (product.categoryId === null || product.categoryId === undefined) {
        return true;
    }
    return category?.active === true;
}

/**
 * A mesma regra, em forma de filtro para a listagem.
 *
 * Referencia a coluna da categoria pelo alias do include (`$category.ativo$`),
 * entao so vale numa consulta que inclua Category — e com `subQuery: false`,
 * senao o Sequelize empurra o limit para uma subconsulta onde o alias nao existe.
 *
 * Repare que aqui vai `ativo`, o nome REAL da coluna, e nao o atributo `active`:
 * nessa sintaxe o Sequelize nao aplica o `field:` declarado no model.
 */
export const AVAILABLE_FILTER: WhereOptions = {
    active: true,
    [Op.or]: [
        { categoryId: null },
        { "$category.ativo$": true },
    ],
};
