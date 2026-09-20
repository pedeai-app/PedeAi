import { Transaction, WhereOptions } from "sequelize";
import { sequelize } from "../config/database";
import { Cart } from "../models/Cart";
import { CartItem } from "../models/CartItem";
import { Product } from "../models/Product";
import { Order } from "../models/Order";
import { OrderItem } from "../models/OrderItem";
import { Customer } from "../models/Customer";
import { OrderStatus } from "../enum/OrderStatus";
import { PaginationParams } from "../utils/pagination";
import { Category } from "../models/Category";
import { isProductAvailable } from "./productAvailability";

export interface OrderFilters {
    status?: OrderStatus;
    customerId?: number;
}

class OrderService {

    async checkout(customerId: number, invoiceCpf: string | null = null) {

        return await sequelize.transaction(async (transaction) => {

            const customer = await Customer.findByPk(customerId, { transaction });

            if (!customer) {
                throw new Error("Cliente não encontrado");
            }

            const cart = await Cart.findOne({
                where: { customerId },
                include: [{ model: CartItem }],
                transaction,
            });

            if (!cart) {
                throw new Error("Carrinho não encontrado");
            }

            const items = cart.get('items') as CartItem[];

            if (!items || items.length === 0) {
                throw new Error("Carrinho vazio");
            }

            let totalAmount = 0;
            const stockUpdates: { product: Product; quantity: number }[] = [];

            // Valida estoque (com lock de linha) e calcula o total
            for (const item of items) {
                const product = await Product.findByPk(item.productId, {
                    transaction,
                    lock: Transaction.LOCK.UPDATE,
                });

                if (!product) {
                    throw new Error(`Produto ${item.productId} não encontrado.`);
                }

                // A categoria vem numa consulta separada, e nao num include no
                // findByPk acima: aquele trava a linha com FOR UPDATE, e o Postgres
                // recusa FOR UPDATE aplicado ao lado anulavel de um outer join.
                //
                // O item entrou no carrinho enquanto estava a venda. Se o produto ou
                // a categoria foram desativados depois, o pedido nao pode fechar com
                // ele — e o nome vai na mensagem para o cliente saber qual tirar.
                const category = product.categoryId
                    ? await Category.findByPk(product.categoryId, { transaction })
                    : null;

                if (!isProductAvailable(product, category)) {
                    throw new Error(`"${product.name}" não está mais disponível. Remova do carrinho para continuar.`);
                }

                if (product.stock < item.quantity) {
                    throw new Error(`Estoque insuficiente para o produto "${product.name}".`);
                }

                totalAmount += Number(item.unitPrice) * item.quantity;
                stockUpdates.push({ product, quantity: item.quantity });
            }

            const order = await Order.create(
                {
                    customerId,
                    // Retrato do momento do fechamento do pedido.
                    customerName: customer.name,
                    deliveryAddress: customer.address,
                    // CPF pedido na nota desta venda; nao mexe no cadastro.
                    invoiceCpf,
                    status: OrderStatus.PENDING,
                    totalAmount,
                },
                {
                    fields: ["customerId", "customerName", "deliveryAddress", "invoiceCpf", "status", "totalAmount"],
                    transaction,
                }
            );

            await OrderItem.bulkCreate(
                items.map((item) => ({
                    orderId: order.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                })),
                { transaction }
            );

            // Baixa de estoque
            for (const { product, quantity } of stockUpdates) {
                await product.decrement("estoque", { by: quantity, transaction });
            }

            await CartItem.destroy({
                where: { cartId: cart.id },
                transaction,
            });

            return order;
        });
    }

    async listOrders({ limit, offset }: PaginationParams, filters: OrderFilters = {}) {
        const where: WhereOptions = {};

        if (filters.status !== undefined) {
            Object.assign(where, { status: filters.status });
        }

        if (filters.customerId !== undefined) {
            Object.assign(where, { customerId: filters.customerId });
        }

        return await Order.findAndCountAll({
            where,
            include: [
                { model: Customer, attributes: ["id", "name", "email"] },
                { model: OrderItem, include: [Product] },
            ],
            limit,
            offset,
            order: [["id", "ASC"]],
            distinct: true,
        });
    }


    async getOrderById(orderId: number) {
        const order = await Order.findByPk(orderId, {
            include: [
                { model: Customer, attributes: ["id", "name", "email", "phone"] },
                { model: OrderItem, include: [Product] },
            ],
        });

        if (!order) {
            throw new Error("Pedido não encontrado");
        }

        return order;
    }


    async listCustomerOrders(customerId: number, { limit, offset }: PaginationParams) {
        return await Order.findAndCountAll({
            where: { customerId },
            include: [{ model: OrderItem, include: [Product] }],
            limit,
            offset,
            order: [["id", "ASC"]],
            distinct: true,
        });
    }

    async updateOrderStatus(orderId: number, status: string) {

        if(!Object.values(OrderStatus).includes(status as OrderStatus)) {
            throw new Error("Status inválido");
        }

        const order = await Order.findByPk(orderId);

        if (!order) {
            throw new Error("Pedido não encontrado");
        }

        order.status = status as OrderStatus;
        await order.save();
        return order;
    }

}

export default new OrderService();
