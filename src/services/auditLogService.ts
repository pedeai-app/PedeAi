import { Transaction } from "sequelize";
import { AuditLog } from "../models/AuditLog";
import { AuditAction, AuditOrigin } from "../enum/AuditAction";

export interface AuditEntry {
    action: AuditAction;
    // A quem o registro se refere; nulo se ninguem foi identificado.
    userId?: number | null;
    // Quem estava logado; nulo antes do login.
    createdBy?: number | null;
    details?: Record<string, unknown> | null;
}

class AuditLogService {

    // So INSERT: log nao se altera nem se apaga. Alteracao de configuracao passa
    // a `transaction` da propria mudanca, para o log e a mudanca entrarem juntos
    // ou nenhum dos dois.
    async record(entry: AuditEntry, transaction?: Transaction) {
        return AuditLog.create(
            {
                action: entry.action,
                userId: entry.userId ?? null,
                createdBy: entry.createdBy ?? null,
                details: entry.details ?? null,
                origin: AuditOrigin.API,
            },
            { transaction },
        );
    }
}

export default new AuditLogService();
