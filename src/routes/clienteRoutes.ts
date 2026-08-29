import { Router } from 'express';
import { ClienteController } from '../controllers/clienteController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { validate } from '../middlewares/validate';
import {
    atualizarClienteValidator,
    idParamValidator,
} from '../validators/clienteValidator';

const router = Router();
const clienteController = new ClienteController();

router.use(authMiddleware, roleMiddleware('ADMIN'));

// Nao existe POST: quem cria cliente e o proprio cliente, por /auth/register,
// que trata email e hash de senha. Ver ADR no PR que removeu esta rota.
router.get('/', clienteController.listarClientes);
router.get('/:id', validate(idParamValidator), clienteController.obterClientePorId);
router.put('/:id', validate(atualizarClienteValidator), clienteController.atualizarCliente);
router.delete('/:id', validate(idParamValidator), clienteController.deletarCliente);


export default router;
