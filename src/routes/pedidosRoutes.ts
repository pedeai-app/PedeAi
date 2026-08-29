import { Router } from 'express';
import PedidoController from '../controllers/pedidoController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { validate } from '../middlewares/validate';
import { pedidoIdParamValidator, atualizarStatusValidator, listarPedidosValidator, finalizarPedidoValidator } from '../validators/pedidoValidator';

const router = Router();

router.get('/', authMiddleware, roleMiddleware('ADMIN'), validate(listarPedidosValidator), PedidoController.listarPedidos);
router.get('/meus-pedidos', authMiddleware, PedidoController.listarPedidosPorCliente);
router.get('/:pedidoId', authMiddleware, roleMiddleware('ADMIN'), validate(pedidoIdParamValidator), PedidoController.buscarPedidoPorId);
router.post('/finalizar', authMiddleware, validate(finalizarPedidoValidator), PedidoController.finalizarPedido);
router.patch('/:pedidoId/status', authMiddleware, roleMiddleware('ADMIN'), validate(atualizarStatusValidator), PedidoController.atualizarStatusPedido);


export default router;
