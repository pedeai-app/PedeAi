import { Carrinho } from "../models/Carrinho";
import { ItemCarrinho } from "../models/ItemCarrinho";
import { Produto } from "../models/Produto";
import { Categoria } from "../models/Categoria";
import { produtoDisponivel } from "./disponibilidadeProduto";

class CarrinhoService {

    async adicionarProduto(
        clienteId: number,
        produtoId: number,
        quantidade: number
    ) { 


        if (quantidade <= 0){
            throw new Error("Quantidade deve ser maior que zero");
        }

        const produto = await Produto.findByPk(produtoId, { include: [{ model: Categoria }] });

        if (!produto) {
            throw new Error("Produto não encontrado.");
    }

        // A tela do catalogo ja nao mostra inativos, mas a regra precisa valer aqui:
        // quem chama a API direto, ou tem um link antigo aberto, passaria por cima.
        if (!produtoDisponivel(produto, produto.categoria)) {
            throw new Error("Este produto não está disponível no momento.");
        }

        if (produto.estoque < quantidade){
            throw new Error("Estoque insuficiente");
        }

        let carrinho = await Carrinho.findOne({ where: { clienteId } });

        if (!carrinho) { 
            carrinho = await Carrinho.create({ clienteId });
        }

        const itemExistente = await ItemCarrinho.findOne({
            where: {
                carrinhoId: carrinho.id,
                produtoId
            }
        });

        if (itemExistente) {
            itemExistente.quantidade += quantidade;

            await itemExistente.save();

            return itemExistente;

        } 

        return await ItemCarrinho.create({
            carrinhoId: carrinho.id,
            produtoId,
            quantidade,
            precoUnitario: produto.preco
        });
}

async buscarCarrinho(clienteId: number) {

            const carrinho = await Carrinho.findOne({
                where: { clienteId },
                include: [{ 
                    model: ItemCarrinho,
                    include: [Produto]
                }]
            });

            if (!carrinho) {
                throw new Error("Carrinho não encontrado");
            }

            return carrinho;
        }

async removerProduto(clienteId: number, itemId: number) {
    const carrinho = await Carrinho.findOne({ where: { clienteId } });

    if (!carrinho) {
        throw new Error("Item não encontrado.");
    }

    const item = await ItemCarrinho.findOne({
        where: { id: itemId, carrinhoId: carrinho.id }
    });

    if (!item) {
        throw new Error("Item não encontrado.");
    }

    await item.destroy();

    return { message: "Produto removido do carrinho." };
    }

async limparCarrinho(clienteId: number) {
    
    const carrinho = await Carrinho.findOne({ where: { clienteId } });

    if (!carrinho) {
        throw new Error("Carrinho não encontrado.");
    }

    await ItemCarrinho.destroy({ where: { carrinhoId: carrinho.id } });
    return { message: "Carrinho limpo." };
    }

}
export default new CarrinhoService();