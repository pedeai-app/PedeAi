import { Request, Response, NextFunction } from "express";
import { Customer } from "../models/Customer";
import { CustomerStatus } from "../enum/CustomerStatus";
import { Permission } from "../enum/Permission";
import permissionService from "../services/permissionService";

// Exige uma permissao (do papel ou extra). Le o papel do banco, nao do token: o
// token vale um dia, e quem foi rebaixado ou desativado perde o acesso na hora.
// Vai depois do authMiddleware.
export function requirePermission(permission: Permission) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: "Usuario não autenticado." });
        }

        const user = await Customer.findByPk(req.user.id, { attributes: ["id", "role", "status"] });

        if (!user || user.status !== CustomerStatus.ACTIVE) {
            return res.status(401).json({ message: "Usuario não autenticado." });
        }

        if (!(await permissionService.hasPermission(user, permission))) {
            return res.status(403).json({ message: "Acesso negado" });
        }

        next();
    };
}
