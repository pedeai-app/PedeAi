import { Cart } from "../models/Cart";
import { CartItem } from "../models/CartItem";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { isProductAvailable } from "./productAvailability";

class CartService {

    async addProduct(
        customerId: number,
        productId: number,
        quantity: number
    ) { 


        if (quantity <= 0){
            throw new Error("Quantidade deve ser maior que zero");
        }

        const product = await Product.findByPk(productId, { include: [{ model: Category }] });

        if (!product) {
            throw new Error("Produto não encontrado.");
    }

        // A tela do catalogo ja nao mostra inativos, mas a regra precisa valer aqui:
        // quem chama a API direto, ou tem um link antigo aberto, passaria por cima.
        if (!isProductAvailable(product, product.category)) {
            throw new Error("Este produto não está disponível no momento.");
        }

        if (product.stock < quantity){
            throw new Error("Estoque insuficiente");
        }

        let cart = await Cart.findOne({ where: { customerId } });

        if (!cart) { 
            cart = await Cart.create({ customerId });
        }

        const existingItem = await CartItem.findOne({
            where: {
                cartId: cart.id,
                productId
            }
        });

        if (existingItem) {
            existingItem.quantity += quantity;

            await existingItem.save();

            return existingItem;

        } 

        return await CartItem.create({
            cartId: cart.id,
            productId,
            quantity,
            unitPrice: product.price
        });
}

async getCart(customerId: number) {

            const cart = await Cart.findOne({
                where: { customerId },
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

async removeProduct(customerId: number, itemId: number) {
    const cart = await Cart.findOne({ where: { customerId } });

    if (!cart) {
        throw new Error("Item não encontrado.");
    }

    const item = await CartItem.findOne({
        where: { id: itemId, cartId: cart.id }
    });

    if (!item) {
        throw new Error("Item não encontrado.");
    }

    await item.destroy();

    return { message: "Produto removido do carrinho." };
    }

async clearCart(customerId: number) {
    
    const cart = await Cart.findOne({ where: { customerId } });

    if (!cart) {
        throw new Error("Carrinho não encontrado.");
    }

    await CartItem.destroy({ where: { cartId: cart.id } });
    return { message: "Carrinho limpo." };
    }

}
export default new CartService();