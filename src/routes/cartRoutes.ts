import { Router } from 'express';
import CartController from '../controllers/cartController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validate';
import { addProductValidator, cartItemParamValidator } from '../validators/cartValidator';

const router = Router();

router.get('/', authMiddleware, CartController.getCart);
router.post('/add', authMiddleware, validate(addProductValidator), CartController.addProduct);
router.delete('/item/:itemId', authMiddleware, validate(cartItemParamValidator), CartController.removeProduct);
router.delete('/clear', authMiddleware, CartController.clearCart);

export default router;
