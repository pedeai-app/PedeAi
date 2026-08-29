import { Transaction, WhereOptions } from "sequelize";
import { sequelize } from "../config/database";
import { Carrinho } from "../models/Carrinho";
import { ItemCarrinho } from "../models/ItemCarrinho";
import { Produto } from "../models/Produto";
import { Pedido } from "../models/Pedido";
import { ItemPedido } from "../models/ItemPedido";
import { Cliente } from "../models/Cliente";
import { StatusPedido } from "../enum/StatusPedido";
import { PaginationParams } from "../utils/pagination";

export interface PedidoFiltros {
    status?: StatusPedido;
    clienteId?: number;
}

class PedidoService {

    async finalizarPedido(clienteId: number) {

        return await sequelize.transaction(async (transaction) => {

            const cliente = await Cliente.findByPk(clienteId, { transaction });

            if (!cliente) {
                throw new Error("Cliente não encontrado");
            }

            const carrinho = await Carrinho.findOne({
                where: { clienteId },
                include: [{ model: ItemCarrinho }],
                transaction,
            });

            if (!carrinho) {
                throw new Error("Carrinho não encontrado");
            }

            const itens = carrinho.get('itens') as ItemCarrinho[];

            if (!itens || itens.length === 0) {
                throw new Error("Carrinho vazio");
            }

            let valorTotal = 0;
            const baixasEstoque: { produto: Produto; quantidade: number }[] = [];

            // Valida estoque (com lock de linha) e calcula o total
            for (const item of itens) {
                const produto = await Produto.findByPk(item.produtoId, {
                    transaction,
                    lock: Transaction.LOCK.UPDATE,
                });

                if (!produto) {
                    throw new Error(`Produto ${item.produtoId} não encontrado.`);
                }

                if (produto.estoque < item.quantidade) {
                    throw new Error(`Estoque insuficiente para o produto "${produto.nome}".`);
                }

                valorTotal += Number(item.precoUnitario) * item.quantidade;
                baixasEstoque.push({ produto, quantidade: item.quantidade });
            }

            const pedido = await Pedido.create(
                {
                    clienteId,
                    // Retrato do momento do fechamento do pedido.
                    nomeCliente: cliente.nome,
                    enderecoEntrega: cliente.endereco,
                    status: StatusPedido.PENDENTE,
                    valorTotal,
                },
                {
                    fields: ["clienteId", "nomeCliente", "enderecoEntrega", "status", "valorTotal"],
                    transaction,
                }
            );

            await ItemPedido.bulkCreate(
                itens.map((item) => ({
                    pedidoId: pedido.id,
                    produtoId: item.produtoId,
                    quantidade: item.quantidade,
                    precoUnitario: item.precoUnitario,
                })),
                { transaction }
            );

            // Baixa de estoque
            for (const { produto, quantidade } of baixasEstoque) {
                await produto.decrement("estoque", { by: quantidade, transaction });
            }

            await ItemCarrinho.destroy({
                where: { carrinhoId: carrinho.id },
                transaction,
            });

            return pedido;
        });
    }

    async listarPedidos({ limit, offset }: PaginationParams, filtros: PedidoFiltros = {}) {
        const where: WhereOptions = {};

        if (filtros.status !== undefined) {
            Object.assign(where, { status: filtros.status });
        }

        if (filtros.clienteId !== undefined) {
            Object.assign(where, { clienteId: filtros.clienteId });
        }

        return await Pedido.findAndCountAll({
            where,
            include: [
                { model: Cliente, attributes: ["id", "nome", "email"] },
                { model: ItemPedido, include: [Produto] },
            ],
            limit,
            offset,
            order: [["id", "ASC"]],
            distinct: true,
        });
    }


    async buscarPedidoPorId(pedidoId: number) {
        const pedido = await Pedido.findByPk(pedidoId, {
            include: [
                { model: Cliente, attributes: ["id", "nome", "email", "telefone"] },
                { model: ItemPedido, include: [Produto] },
            ],
        });

        if (!pedido) {
            throw new Error("Pedido não encontrado");
        }

        return pedido;
    }


    async listarPedidosPorCliente(clienteId: number, { limit, offset }: PaginationParams) {
        return await Pedido.findAndCountAll({
            where: { clienteId },
            include: [{ model: ItemPedido, include: [Produto] }],
            limit,
            offset,
            order: [["id", "ASC"]],
            distinct: true,
        });
    }

    async atualizarStatusPedido(pedidoId: number, status: string) {

        if(!Object.values(StatusPedido).includes(status as StatusPedido)) {
            throw new Error("Status inválido");
        }

        const pedido = await Pedido.findByPk(pedidoId);

        if (!pedido) {
            throw new Error("Pedido não encontrado");
        }

        pedido.status = status as StatusPedido;
        await pedido.save();
        return pedido;
    }

}

export default new PedidoService();
