import { UniqueConstraintError } from "sequelize";
import { sequelize } from "../config/database";
import { Customer } from "../models/Customer";
import { UserPermission } from "../models/UserPermission";
import { Permission, ROLE_PERMISSIONS } from "../enum/Permission";
import { Role } from "../enum/Role";
import { AuditAction } from "../enum/AuditAction";
import auditLogService from "./auditLogService";
import { AccessError } from "./accessError";

// Aceita o proprio Customer, cujo `id` o Sequelize tipa como opcional.
interface PermissionHolder {
    id?: number;
    role: Role;
}

class PermissionService {

    // A unica pergunta "pode?" da API: o que o papel traz mais as extras do
    // usuario. O PDV responde a mesma pergunta com a mesma regra.
    async hasPermission(user: PermissionHolder, permission: Permission): Promise<boolean> {
        if (ROLE_PERMISSIONS[user.role]?.includes(permission)) {
            return true;
        }

        if (user.id === undefined) {
            return false;
        }

        const extra = await UserPermission.findOne({
            where: { userId: user.id, permission },
            attributes: ["id"],
        });

        return extra !== null;
    }

    async listPermissions(customerId: number) {
        const customer = await this.findCustomer(customerId);

        const extras = await UserPermission.findAll({
            where: { userId: customerId },
            attributes: ["permission", "grantedBy", "createdAt"],
            order: [["permission", "ASC"]],
        });

        const fromRole = [...ROLE_PERMISSIONS[customer.role]];
        const effective = Array.from(new Set([...fromRole, ...extras.map((e) => e.permission)])).sort();

        return { role: customer.role, fromRole, extra: extras, effective };
    }

    async grant(customerId: number, permission: Permission, adminId: number) {
        return sequelize.transaction(async (transaction) => {
            const customer = await this.findCustomer(customerId);

            if (customer.role === Role.CUSTOMER) {
                throw new AccessError("INVALID", "Permissão extra só pode ser dada a ADMIN ou CASHIER.");
            }

            if (ROLE_PERMISSIONS[customer.role].includes(permission)) {
                throw new AccessError("CONFLICT", "Essa permissão já vem do papel do usuário.");
            }

            try {
                const granted = await UserPermission.create(
                    { userId: customerId, permission, grantedBy: adminId },
                    { transaction },
                );

                await auditLogService.record(
                    {
                        action: AuditAction.PERMISSION_GRANTED,
                        userId: customerId,
                        createdBy: adminId,
                        details: { permission },
                    },
                    transaction,
                );

                return granted;
            } catch (error) {
                if (error instanceof UniqueConstraintError) {
                    throw new AccessError("CONFLICT", "O usuário já tem essa permissão.");
                }
                throw error;
            }
        });
    }

    // Revogar apaga a linha: permissao e configuracao, nao movimentacao. O
    // historico da concessao fica no log.
    async revoke(customerId: number, permission: Permission, adminId: number) {
        return sequelize.transaction(async (transaction) => {
            const granted = await UserPermission.findOne({
                where: { userId: customerId, permission },
                transaction,
            });

            if (!granted) {
                throw new AccessError("NOT_FOUND", "O usuário não tem essa permissão extra.");
            }

            await granted.destroy({ transaction });

            await auditLogService.record(
                {
                    action: AuditAction.PERMISSION_REVOKED,
                    userId: customerId,
                    createdBy: adminId,
                    details: { permission },
                },
                transaction,
            );
        });
    }

    private async findCustomer(customerId: number) {
        const customer = await Customer.findByPk(customerId);

        if (!customer) {
            throw new AccessError("NOT_FOUND", "Cliente não encontrado.");
        }

        return customer;
    }
}

export default new PermissionService();
