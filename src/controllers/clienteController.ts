import {Request, Response} from 'express';
import { ClienteService, ClienteFiltros } from '../services/clienteService';
import { StatusCliente } from '../enum/StatusCliente';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';

const clienteService = new ClienteService();

// ?status=ATIVO|INATIVO|ANONIMIZADO filtra; ?status=TODOS traz o cadastro inteiro.
// Ausente ou invalido cai em ATIVO, que e a visao de trabalho do painel.
function getClienteFiltros(query: Request["query"]): ClienteFiltros {
    if (query.status === 'TODOS') {
        return {};
    }

    // Compara com os valores, nao com `in`: o operador percorre o prototype, e
    // ?status=constructor passaria a checagem para virar um enum invalido na
    // query — o Postgres responderia com erro, e o filtro viraria um 500.
    const valores: string[] = Object.values(StatusCliente);
    if (typeof query.status === 'string' && valores.includes(query.status)) {
        return { status: query.status as StatusCliente };
    }

    return { status: StatusCliente.ATIVO };
}

export class ClienteController {

    async listarClientes(req: Request, res: Response) {
        const { page, limit, offset } = getPaginationParams(req.query);
        const filtros = getClienteFiltros(req.query);
        const { rows, count } = await clienteService.listarClientes({ page, limit, offset }, filtros);

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

    async resetarSenha(req: Request, res: Response) {
        try {
            const resultado = await clienteService.resetarSenha(Number(req.params.id));
            return res.status(200).json(resultado);
        } catch (error: any) {
            return res.status(404).json({ message: error.message });
        }
    }

    // DELETE mantido no contrato: para quem chama, o efeito continua sendo "tira
    // este cliente do ar". O que mudou e que a linha sobrevive — ver o service.
    async desativarCliente(req: Request, res: Response) {
        try { 
            const { id } = req.params;
            await clienteService.desativarCliente(Number(id));
            return res.status(204).send();
        
        } catch (error: any) {
            return res.status(404).json({ message: error.message });
        }
    }

    async reativarCliente(req: Request, res: Response) {
        try {
            const cliente = await clienteService.reativarCliente(Number(req.params.id));
            return res.status(200).json(cliente);

        } catch (error: any) {
            return res.status(404).json({ message: error.message });
        }
    }
}

