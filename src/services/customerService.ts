import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { WhereOptions } from "sequelize";
import { Op } from "sequelize";
import { sequelize } from "../config/database";
import { Customer } from "../models/Customer";
import { UserPermission } from "../models/UserPermission";
import { CustomerStatus } from "../enum/CustomerStatus";
import { Role } from "../enum/Role";
import { AuditAction } from "../enum/AuditAction";
import { PaginationParams } from "../utils/pagination";
import auditLogService from "./auditLogService";
import { AccessError } from "./accessError";

export interface CustomerFilters {
    status?: CustomerStatus;
}

const ALLOWED_FIELDS = ["name", "cpf", "phone", "address"] as const;

// Alfabeto sem caracteres ambiguos (0/O, 1/l/I): a senha temporaria vai ser lida
// em voz alta ou copiada de uma mensagem, entao confundir custa caro.
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export class CustomerService {

// Sem filtro explicito a listagem mostra so os ATIVOS: quem foi desativado sai
// da tela, que e o que o lojista espera de "excluir". O painel pede
// ?status=INACTIVE para reencontrar quem desativou por engano.
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
    name: string;
    cpf: string;
    phone: string;
    address: string;
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
        fields: [...ALLOWED_FIELDS],
    });
    return customer;
}   

async resetPassword(id: number) {

    const customer = await Customer.scope('withPassword').findByPk(id);

    if (!customer) {
        throw new Error("Cliente não encontrado.");
    }

    const temporaryPassword = Array.from(
        randomBytes(10),
        (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length],
    ).join("");

    customer.password = await bcrypt.hash(temporaryPassword, 10);
    customer.temporaryPassword = true;
    await customer.save();

    // Unica vez que o texto puro existe fora do navegador do lojista: nao e
    // gravado em lugar nenhum, so devolvido nesta resposta.
    return { temporaryPassword };
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

    if (customer.status === CustomerStatus.ANONYMIZED) {
        throw new Error("Cliente anonimizado não pode ser alterado.");
    }

    customer.status = CustomerStatus.INACTIVE;
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

    if (customer.status === CustomerStatus.ANONYMIZED) {
        throw new Error("Cliente anonimizado não pode ser reativado.");
    }

    customer.status = CustomerStatus.ACTIVE;
    await customer.save();

    return customer;
}


// Troca o papel. Quem passa a CUSTOMER perde o PIN e as permissoes extras: so
// quem trabalha na loja tem esses dois. Tudo na mesma transacao do log.
async changeRole(id: number, role: Role, adminId: number) {

    if (id === adminId) {
        throw new AccessError("FORBIDDEN", "Você não pode alterar o próprio papel.");
    }

    return sequelize.transaction(async (transaction) => {
        const customer = await Customer.scope('withPin').findByPk(id, { transaction });

        if (!customer) {
            throw new AccessError("NOT_FOUND", "Cliente não encontrado.");
        }

        if (customer.status === CustomerStatus.ANONYMIZED) {
            throw new AccessError("INVALID", "Cliente anonimizado não pode ser alterado.");
        }

        const previousRole = customer.role;
        if (previousRole === role) {
            return Customer.findByPk(id, { transaction });
        }

        const details: Record<string, unknown> = { from: previousRole, to: role };

        if (role === Role.CUSTOMER) {
            const extras = await UserPermission.findAll({ where: { userId: id }, transaction });
            if (extras.length > 0) {
                details.revokedPermissions = extras.map((extra) => extra.permission);
                await UserPermission.destroy({ where: { userId: id }, transaction });
            }
            if (customer.pinHash) {
                details.pinRemoved = true;
                customer.pinHash = null;
            }
        }

        customer.role = role;
        await customer.save({ transaction });

        await auditLogService.record(
            { action: AuditAction.ROLE_CHANGED, userId: id, createdBy: adminId, details },
            transaction,
        );

        return Customer.findByPk(id, { transaction });
    });
}

// O PDV entra so com o PIN, sem escolher o usuario: dois ativos com o mesmo PIN
// tornariam o login ambiguo. Como o hash nao permite busca, a checagem compara
// com o PIN de cada um — sao poucos. O PIN nunca vai para o log.
async setPin(id: number, pin: string, adminId: number) {

    return sequelize.transaction(async (transaction) => {
        const customer = await Customer.scope('withPin').findByPk(id, { transaction });

        if (!customer) {
            throw new AccessError("NOT_FOUND", "Cliente não encontrado.");
        }

        if (customer.role === Role.CUSTOMER) {
            throw new AccessError("INVALID", "PIN só pode ser definido para ADMIN ou CASHIER.");
        }

        const others = await Customer.scope('withPin').findAll({
            where: {
                id: { [Op.ne]: id },
                role: [Role.ADMIN, Role.CASHIER],
                status: CustomerStatus.ACTIVE,
                pinHash: { [Op.ne]: null },
            },
            attributes: ["id", "pinHash"],
            transaction,
        });

        for (const other of others) {
            if (await bcrypt.compare(pin, other.pinHash as string)) {
                throw new AccessError("CONFLICT", "Este PIN já está em uso por outro usuário.");
            }
        }

        const hadPin = customer.pinHash !== null;
        customer.pinHash = await bcrypt.hash(pin, 10);
        await customer.save({ transaction });

        await auditLogService.record(
            { action: AuditAction.PIN_CHANGED, userId: id, createdBy: adminId, details: { hadPin } },
            transaction,
        );
    });
}

}
