import { Router } from 'express';
import ProductController from '../controllers/productController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { validate } from '../middlewares/validate';
import { createProductValidator, updateProductValidator, productIdValidator } from '../validators/productValidator';
import { uploadProductImage } from '../middlewares/uploadProductImage';

const router = Router();

router.post('/', authMiddleware, roleMiddleware('ADMIN'), validate(createProductValidator), ProductController.createProduct);
router.get('/', ProductController.listProducts);
router.get('/:id', ProductController.getProductById);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), validate(updateProductValidator), ProductController.updateProduct);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), ProductController.deleteProduct);

// Foto do produto. O upload vem depois da checagem de ADMIN de proposito: quem nao
// pode enviar e recusado antes de o servidor ler megabytes de corpo.
router.put('/:id/image', authMiddleware, roleMiddleware('ADMIN'), validate(productIdValidator), uploadProductImage, ProductController.setImage);
router.delete('/:id/image', authMiddleware, roleMiddleware('ADMIN'), validate(productIdValidator), ProductController.removeImage);

export default router;
