import { Router } from 'express';
import OrderController from '../controllers/orderController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { validate } from '../middlewares/validate';
import { orderIdParamValidator, updateStatusValidator, listOrdersValidator, checkoutValidator } from '../validators/orderValidator';

const router = Router();

router.get('/', authMiddleware, roleMiddleware('ADMIN'), validate(listOrdersValidator), OrderController.listOrders);
router.get('/meus-pedidos', authMiddleware, OrderController.listCustomerOrders);
router.get('/:pedidoId', authMiddleware, roleMiddleware('ADMIN'), validate(orderIdParamValidator), OrderController.getOrderById);
router.post('/finalizar', authMiddleware, validate(checkoutValidator), OrderController.checkout);
router.patch('/:pedidoId/status', authMiddleware, roleMiddleware('ADMIN'), validate(updateStatusValidator), OrderController.updateOrderStatus);


export default router;
