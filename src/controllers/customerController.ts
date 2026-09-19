import {Request, Response} from 'express';
import { CustomerService, CustomerFilters } from '../services/customerService';
import { CustomerStatus } from '../enum/CustomerStatus';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';

const customerService = new CustomerService();

// ?status=ATIVO|INATIVO|ANONIMIZADO filtra; ?status=TODOS traz o cadastro inteiro.
// Ausente ou invalido cai em ATIVO, que e a visao de trabalho do painel.
function getCustomerFilters(query: Request["query"]): CustomerFilters {
    if (query.status === 'TODOS') {
        return {};
    }

    // Compara com os valores, nao com `in`: o operador percorre o prototype, e
    // ?status=constructor passaria a checagem para virar um enum invalido na
    // query — o Postgres responderia com erro, e o filtro viraria um 500.
    const values: string[] = Object.values(CustomerStatus);
    if (typeof query.status === 'string' && values.includes(query.status)) {
        return { status: query.status as CustomerStatus };
    }

    return { status: CustomerStatus.ATIVO };
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
}

