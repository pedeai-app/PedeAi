import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { WhereOptions } from "sequelize";
import { Cliente } from "../models/Cliente";
import { StatusCliente } from "../enum/StatusCliente";
import { PaginationParams } from "../utils/pagination";

export interface ClienteFiltros {
    status?: StatusCliente;
}

const CAMPOS_PERMITIDOS = ["nome", "cpf", "telefone", "endereco"] as const;

// Alfabeto sem caracteres ambiguos (0/O, 1/l/I): a senha temporaria vai ser lida
// em voz alta ou copiada de uma mensagem, entao confundir custa caro.
const ALFABETO_SENHA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export class ClienteService {

// Sem filtro explicito a listagem mostra so os ATIVOS: quem foi desativado sai
// da tela, que e o que o lojista espera de "excluir". O painel pede
// ?status=INATIVO para reencontrar quem desativou por engano.
async listarClientes({ limit, offset }: PaginationParams, filtros: ClienteFiltros = {}) {
    const where: WhereOptions = {};

    if (filtros.status !== undefined) {
        Object.assign(where, { status: filtros.status });
    }

    return Cliente.findAndCountAll({
        where,
        limit,
        offset,
        order: [["id", "ASC"]],
    });
}

async obterClientePorId(id: number) {
    return Cliente.findByPk(id);
}   

async atualizarCliente(id: number, clienteData: Partial<{
    nome: string;
    cpf: string;
    telefone: string;
    endereco: string;
}>) {
    const cliente = await Cliente.findByPk(id);

    if (!cliente) {
        throw new Error("Cliente não encontrado.");
    }

    // O validator trata cpf como opcional, entao a checagem de duplicidade so
    // roda quando ele vem no corpo: um where com undefined quebra a query.
    if (clienteData.cpf !== undefined) {
        const clienteExistente = await Cliente.findOne({
            where: { cpf: clienteData.cpf },
        });

        if (clienteExistente && clienteExistente.id !== id) {
            throw new Error("Outro cliente com este CPF já existe.");
        }
    }

    await cliente.update(clienteData, {
        fields: [...CAMPOS_PERMITIDOS],
    });
    return cliente;
}   

async resetarSenha(id: number) {

    const cliente = await Cliente.scope('comSenha').findByPk(id);

    if (!cliente) {
        throw new Error("Cliente não encontrado.");
    }

    const senhaTemporaria = Array.from(
        randomBytes(10),
        (byte) => ALFABETO_SENHA[byte % ALFABETO_SENHA.length],
    ).join("");

    cliente.senha = await bcrypt.hash(senhaTemporaria, 10);
    cliente.senhaTemporaria = true;
    await cliente.save();

    // Unica vez que o texto puro existe fora do navegador do lojista: nao e
    // gravado em lugar nenhum, so devolvido nesta resposta.
    return { senhaTemporaria };
}

// Nao apaga a linha. As FKs de `carrinhos` e `pedidos` sao ON DELETE CASCADE,
// entao um destroy() levaria o historico de vendas do cliente junto — e a nota
// e dado fiscal, que a loja precisa guardar mesmo depois de o cadastro sair do
// ar. Desativar tira o acesso e some da listagem, que e o efeito pretendido.
async desativarCliente(id: number) {

    const cliente = await Cliente.findByPk(id);

    if (!cliente) {
        throw new Error("Cliente não encontrado.");
    }

    if (cliente.status === StatusCliente.ANONIMIZADO) {
        throw new Error("Cliente anonimizado não pode ser alterado.");
    }

    cliente.status = StatusCliente.INATIVO;
    await cliente.save();

    return cliente;
}

// A contrapartida de desativar. Sem ela, desativar por engano seria tao
// definitivo quanto o DELETE que este PR removeu.
async reativarCliente(id: number) {

    const cliente = await Cliente.findByPk(id);

    if (!cliente) {
        throw new Error("Cliente não encontrado.");
    }

    if (cliente.status === StatusCliente.ANONIMIZADO) {
        throw new Error("Cliente anonimizado não pode ser reativado.");
    }

    cliente.status = StatusCliente.ATIVO;
    await cliente.save();

    return cliente;
}

}
