import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { WhereOptions } from "sequelize";
import { Customer } from "../models/Customer";
import { CustomerStatus } from "../enum/CustomerStatus";
import { PaginationParams } from "../utils/pagination";

export interface CustomerFilters {
    status?: CustomerStatus;
}

const CAMPOS_PERMITIDOS = ["nome", "cpf", "telefone", "endereco"] as const;

// Alfabeto sem caracteres ambiguos (0/O, 1/l/I): a senha temporaria vai ser lida
// em voz alta ou copiada de uma mensagem, entao confundir custa caro.
const ALFABETO_SENHA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export class CustomerService {

// Sem filtro explicito a listagem mostra so os ATIVOS: quem foi desativado sai
// da tela, que e o que o lojista espera de "excluir". O painel pede
// ?status=INATIVO para reencontrar quem desativou por engano.
async listCustomers({ limit, offset }: PaginationParams, filters: CustomerFilters = {}) {
    const where: WhereOptions = {};

    if (filters.status !== undefined) {
        Object.assign(where, { status: filters.status });
    }

    return Customer.findAndCountAll({
        where,
        limit,
        offset,
        order: [["id", "ASC"]],
    });
}

async getCustomerById(id: number) {
    return Customer.findByPk(id);
}   

async updateCustomer(id: number, customerData: Partial<{
    nome: string;
    cpf: string;
    telefone: string;
    endereco: string;
}>) {
    const customer = await Customer.findByPk(id);

    if (!customer) {
        throw new Error("Cliente não encontrado.");
    }

    // O validator trata cpf como opcional, entao a checagem de duplicidade so
    // roda quando ele vem no corpo: um where com undefined quebra a query.
    if (customerData.cpf !== undefined) {
        const existingCustomer = await Customer.findOne({
            where: { cpf: customerData.cpf },
        });

        if (existingCustomer && existingCustomer.id !== id) {
            throw new Error("Outro cliente com este CPF já existe.");
        }
    }

    await customer.update(customerData, {
        fields: [...CAMPOS_PERMITIDOS],
    });
    return customer;
}   

async resetPassword(id: number) {

    const customer = await Customer.scope('comSenha').findByPk(id);

    if (!customer) {
        throw new Error("Cliente não encontrado.");
    }

    const senhaTemporaria = Array.from(
        randomBytes(10),
        (byte) => ALFABETO_SENHA[byte % ALFABETO_SENHA.length],
    ).join("");

    customer.senha = await bcrypt.hash(senhaTemporaria, 10);
    customer.senhaTemporaria = true;
    await customer.save();

    // Unica vez que o texto puro existe fora do navegador do lojista: nao e
    // gravado em lugar nenhum, so devolvido nesta resposta.
    return { senhaTemporaria };
}

// Nao apaga a linha. As FKs de `carrinhos` e `pedidos` sao ON DELETE CASCADE,
// entao um destroy() levaria o historico de vendas do cliente junto — e a nota
// e dado fiscal, que a loja precisa guardar mesmo depois de o cadastro sair do
// ar. Desativar tira o acesso e some da listagem, que e o efeito pretendido.
async deactivateCustomer(id: number) {

    const customer = await Customer.findByPk(id);

    if (!customer) {
        throw new Error("Cliente não encontrado.");
    }

    if (customer.status === CustomerStatus.ANONIMIZADO) {
        throw new Error("Cliente anonimizado não pode ser alterado.");
    }

    customer.status = CustomerStatus.INATIVO;
    await customer.save();

    return customer;
}

// A contrapartida de desativar. Sem ela, desativar por engano seria tao
// definitivo quanto o DELETE que este PR removeu.
async reactivateCustomer(id: number) {

    const customer = await Customer.findByPk(id);

    if (!customer) {
        throw new Error("Cliente não encontrado.");
    }

    if (customer.status === CustomerStatus.ANONIMIZADO) {
        throw new Error("Cliente anonimizado não pode ser reativado.");
    }

    customer.status = CustomerStatus.ATIVO;
    await customer.save();

    return customer;
}

}
