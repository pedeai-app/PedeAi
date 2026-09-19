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
    clienteId?: number;
}

class OrderService {

    async checkout(clienteId: number, cpfNota: string | null = null) {

        return await sequelize.transaction(async (transaction) => {

            const customer = await Customer.findByPk(clienteId, { transaction });

            if (!customer) {
                throw new Error("Cliente não encontrado");
            }

            const cart = await Cart.findOne({
                where: { clienteId },
                include: [{ model: CartItem }],
                transaction,
            });

            if (!cart) {
                throw new Error("Carrinho não encontrado");
            }

            const itens = cart.get('itens') as CartItem[];

            if (!itens || itens.length === 0) {
                throw new Error("Carrinho vazio");
            }

            let valorTotal = 0;
            const stockUpdates: { product: Product; quantidade: number }[] = [];

            // Valida estoque (com lock de linha) e calcula o total
            for (const item of itens) {
                const product = await Product.findByPk(item.produtoId, {
                    transaction,
                    lock: Transaction.LOCK.UPDATE,
                });

                if (!product) {
                    throw new Error(`Produto ${item.produtoId} não encontrado.`);
                }

                // A categoria vem numa consulta separada, e nao num include no
                // findByPk acima: aquele trava a linha com FOR UPDATE, e o Postgres
                // recusa FOR UPDATE aplicado ao lado anulavel de um outer join.
                //
                // O item entrou no carrinho enquanto estava a venda. Se o produto ou
                // a categoria foram desativados depois, o pedido nao pode fechar com
                // ele — e o nome vai na mensagem para o cliente saber qual tirar.
                const category = product.categoriaId
                    ? await Category.findByPk(product.categoriaId, { transaction })
                    : null;

                if (!isProductAvailable(product, category)) {
                    throw new Error(`"${product.nome}" não está mais disponível. Remova do carrinho para continuar.`);
                }

                if (product.estoque < item.quantidade) {
                    throw new Error(`Estoque insuficiente para o produto "${product.nome}".`);
                }

                valorTotal += Number(item.precoUnitario) * item.quantidade;
                stockUpdates.push({ product, quantidade: item.quantidade });
            }

            const order = await Order.create(
                {
                    clienteId,
                    // Retrato do momento do fechamento do pedido.
                    nomeCliente: customer.nome,
                    enderecoEntrega: customer.endereco,
                    // CPF pedido na nota desta venda; nao mexe no cadastro.
                    cpfNota,
                    status: OrderStatus.PENDENTE,
                    valorTotal,
                },
                {
                    fields: ["clienteId", "nomeCliente", "enderecoEntrega", "cpfNota", "status", "valorTotal"],
                    transaction,
                }
            );

            await OrderItem.bulkCreate(
                itens.map((item) => ({
                    pedidoId: order.id,
                    produtoId: item.produtoId,
                    quantidade: item.quantidade,
                    precoUnitario: item.precoUnitario,
                })),
                { transaction }
            );

            // Baixa de estoque
            for (const { product, quantidade } of stockUpdates) {
                await product.decrement("estoque", { by: quantidade, transaction });
            }

            await CartItem.destroy({
                where: { carrinhoId: cart.id },
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

        if (filters.clienteId !== undefined) {
            Object.assign(where, { clienteId: filters.clienteId });
        }

        return await Order.findAndCountAll({
            where,
            include: [
                { model: Customer, attributes: ["id", "nome", "email"] },
                { model: OrderItem, include: [Product] },
            ],
            limit,
            offset,
            order: [["id", "ASC"]],
            distinct: true,
        });
    }


    async getOrderById(pedidoId: number) {
        const order = await Order.findByPk(pedidoId, {
            include: [
                { model: Customer, attributes: ["id", "nome", "email", "telefone"] },
                { model: OrderItem, include: [Product] },
            ],
        });

        if (!order) {
            throw new Error("Pedido não encontrado");
        }

        return order;
    }


    async listCustomerOrders(clienteId: number, { limit, offset }: PaginationParams) {
        return await Order.findAndCountAll({
            where: { clienteId },
            include: [{ model: OrderItem, include: [Product] }],
            limit,
            offset,
            order: [["id", "ASC"]],
            distinct: true,
        });
    }

    async updateOrderStatus(pedidoId: number, status: string) {

        if(!Object.values(OrderStatus).includes(status as OrderStatus)) {
            throw new Error("Status inválido");
        }

        const order = await Order.findByPk(pedidoId);

        if (!order) {
            throw new Error("Pedido não encontrado");
        }

        order.status = status as OrderStatus;
        await order.save();
        return order;
    }

}

export default new OrderService();
