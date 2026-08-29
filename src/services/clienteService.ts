import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { Cliente } from "../models/Cliente";
import { PaginationParams } from "../utils/pagination";

const CAMPOS_PERMITIDOS = ["nome", "cpf", "telefone", "endereco"] as const;

// Alfabeto sem caracteres ambiguos (0/O, 1/l/I): a senha temporaria vai ser lida
// em voz alta ou copiada de uma mensagem, entao confundir custa caro.
const ALFABETO_SENHA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export class ClienteService {

async listarClientes({ limit, offset }: PaginationParams) {
    return Cliente.findAndCountAll({
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

async deletarCliente(id: number) {

    const cliente = await Cliente.findByPk(id);

    if (!cliente) {
        throw new Error("Cliente não encontrado.");
    }

    await cliente.destroy();

    return { message: "Cliente deletado com sucesso." };
}

}
