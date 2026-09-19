import { Cart } from "../models/Cart";
import { CartItem } from "../models/CartItem";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { isProductAvailable } from "./productAvailability";

class CartService {

    async addProduct(
        clienteId: number,
        produtoId: number,
        quantidade: number
    ) { 


        if (quantidade <= 0){
            throw new Error("Quantidade deve ser maior que zero");
        }

        const product = await Product.findByPk(produtoId, { include: [{ model: Category }] });

        if (!product) {
            throw new Error("Produto não encontrado.");
    }

        // A tela do catalogo ja nao mostra inativos, mas a regra precisa valer aqui:
        // quem chama a API direto, ou tem um link antigo aberto, passaria por cima.
        if (!isProductAvailable(product, product.categoria)) {
            throw new Error("Este produto não está disponível no momento.");
        }

        if (product.estoque < quantidade){
            throw new Error("Estoque insuficiente");
        }

        let cart = await Cart.findOne({ where: { clienteId } });

        if (!cart) { 
            cart = await Cart.create({ clienteId });
        }

        const existingItem = await CartItem.findOne({
            where: {
                carrinhoId: cart.id,
                produtoId
            }
        });

        if (existingItem) {
            existingItem.quantidade += quantidade;

            await existingItem.save();

            return existingItem;

        } 

        return await CartItem.create({
            carrinhoId: cart.id,
            produtoId,
            quantidade,
            precoUnitario: product.preco
        });
}

async getCart(clienteId: number) {

            const cart = await Cart.findOne({
                where: { clienteId },
                include: [{ 
                    model: CartItem,
                    include: [Product]
                }]
            });

            if (!cart) {
                throw new Error("Carrinho não encontrado");
            }

            return cart;
        }

async removeProduct(clienteId: number, itemId: number) {
    const cart = await Cart.findOne({ where: { clienteId } });

    if (!cart) {
        throw new Error("Item não encontrado.");
    }

    const item = await CartItem.findOne({
        where: { id: itemId, carrinhoId: cart.id }
    });

    if (!item) {
        throw new Error("Item não encontrado.");
    }

    await item.destroy();

    return { message: "Produto removido do carrinho." };
    }

async clearCart(clienteId: number) {
    
    const cart = await Cart.findOne({ where: { clienteId } });

    if (!cart) {
        throw new Error("Carrinho não encontrado.");
    }

    await CartItem.destroy({ where: { carrinhoId: cart.id } });
    return { message: "Carrinho limpo." };
    }

}
export default new CartService();