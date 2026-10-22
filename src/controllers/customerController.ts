import {Request, Response} from 'express';
import { CustomerService, CustomerFilters } from '../services/customerService';
import { CustomerStatus } from '../enum/CustomerStatus';
import { Role } from '../enum/Role';
import { Permission } from '../enum/Permission';
import permissionService from '../services/permissionService';
import { AccessError, AccessErrorReason } from '../services/accessError';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';

const customerService = new CustomerService();

const ACCESS_ERROR_STATUS: Record<AccessErrorReason, number> = {
    NOT_FOUND: 404,
    INVALID: 400,
    CONFLICT: 409,
    FORBIDDEN: 403,
};

// Erro de regra vira o status do motivo; o resto segue para o errorHandler (500).
function respondAccessError(res: Response, error: unknown) {
    if (error instanceof AccessError) {
        return res.status(ACCESS_ERROR_STATUS[error.reason]).json({ message: error.message });
    }
    throw error;
}

// ?status=ACTIVE|INACTIVE|ANONYMIZED filtra; ?status=ALL traz o cadastro inteiro.
// Ausente ou invalido cai em ATIVO, que e a visao de trabalho do painel.
function getCustomerFilters(query: Request["query"]): CustomerFilters {
    if (query.status === 'ALL') {
        return {};
    }

    // Compara com os valores, nao com `in`: o operador percorre o prototype, e
    // ?status=constructor passaria a checagem para virar um enum invalido na
    // query — o Postgres responderia com erro, e o filtro viraria um 500.
    const values: string[] = Object.values(CustomerStatus);
    if (typeof query.status === 'string' && values.includes(query.status)) {
        return { status: query.status as CustomerStatus };
    }

    return { status: CustomerStatus.ACTIVE };
}

export class CustomerController {

    async listCustomers(req: Request, res: Response) {
        const { page, limit, offset } = getPaginationParams(req.query);
        const filters = getCustomerFilters(req.query);
        const { rows, count } = await customerService.listCustomers({ page, limit, offset }, filters);

        return res.json(buildPaginatedResult(rows, count, page, limit));
    }

    async getCustomerById(req: Request, res: Response) {
        const { id } = req.params;
        const customer = await customerService.getCustomerById
        (Number(req.params.id)
    );

    if (!customer) {
        return res.status(404).json({ 
            message: "Cliente não encontrado." 
        });
    }   
    return res.json(customer);
    }

    async updateCustomer(req: Request, res: Response) {
        try {
            
            const customerData = await customerService.updateCustomer(Number(req.params.id), req.body);
return res.status(200).json(customerData);
        } catch (error: any) {
            return res.status(400).json({ message: error.message });
        }
    }

    async resetPassword(req: Request, res: Response) {
        try {
            const result = await customerService.resetPassword(Number(req.params.id));
            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(404).json({ message: error.message });
        }
    }

    // DELETE mantido no contrato: para quem chama, o efeito continua sendo "tira
    // este cliente do ar". O que mudou e que a linha sobrevive — ver o service.
    async deactivateCustomer(req: Request, res: Response) {
        try { 
            const { id } = req.params;
            await customerService.deactivateCustomer(Number(id));
            return res.status(204).send();
        
        } catch (error: any) {
            return res.status(404).json({ message: error.message });
        }
    }

    async reactivateCustomer(req: Request, res: Response) {
        try {
            const customer = await customerService.reactivateCustomer(Number(req.params.id));
            return res.status(200).json(customer);

        } catch (error: any) {
            return res.status(404).json({ message: error.message });
        }
    }

    async changeRole(req: Request, res: Response) {
        try {
            const customer = await customerService.changeRole(Number(req.params.id), req.body.role as Role, req.user!.id);
            return res.status(200).json(customer);
        } catch (error) {
            return respondAccessError(res, error);
        }
    }

    async setPin(req: Request, res: Response) {
        try {
            await customerService.setPin(Number(req.params.id), req.body.pin, req.user!.id);
            return res.status(204).send();
        } catch (error) {
            return respondAccessError(res, error);
        }
    }

    async listPermissions(req: Request, res: Response) {
        try {
            const permissions = await permissionService.listPermissions(Number(req.params.id));
            return res.status(200).json(permissions);
        } catch (error) {
            return respondAccessError(res, error);
        }
    }

    async grantPermission(req: Request, res: Response) {
        try {
            const granted = await permissionService.grant(
                Number(req.params.id),
                req.body.permission as Permission,
                req.user!.id,
            );
            return res.status(201).json(granted);
        } catch (error) {
            return respondAccessError(res, error);
        }
    }

    async revokePermission(req: Request, res: Response) {
        try {
            await permissionService.revoke(Number(req.params.id), req.params.permission as Permission, req.user!.id);
            return res.status(204).send();
        } catch (error) {
            return respondAccessError(res, error);
        }
    }
}

