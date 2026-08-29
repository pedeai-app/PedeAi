import {Request, Response} from 'express';
import { ClienteService } from '../services/clienteService';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';

const clienteService = new ClienteService();

export class ClienteController {

    async listarClientes(req: Request, res: Response) {
        const { page, limit, offset } = getPaginationParams(req.query);
        const { rows, count } = await clienteService.listarClientes({ page, limit, offset });

        return res.json(buildPaginatedResult(rows, count, page, limit));
    }

    async obterClientePorId(req: Request, res: Response) {
        const { id } = req.params;
        const cliente = await clienteService.obterClientePorId
        (Number(req.params.id)
    );

    if (!cliente) {
        return res.status(404).json({ 
            message: "Cliente não encontrado." 
        });
    }   
    return res.json(cliente);
    }

    async atualizarCliente(req: Request, res: Response) {
        try {
            
            const clienteData = await clienteService.atualizarCliente(Number(req.params.id), req.body);
return res.status(200).json(clienteData);
        } catch (error: any) {
            return res.status(400).json({ message: error.message });
        }
    }

    async deletarCliente(req: Request, res: Response) {
        try { 
            const { id } = req.params;
            await clienteService.deletarCliente(Number(id));
            return res.status(204).send();
        
        } catch (error: any) {
            return res.status(404).json({ message: error.message });
        }
    }   
}

