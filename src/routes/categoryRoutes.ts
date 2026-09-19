import { Router } from 'express';
import CategoryController from '../controllers/categoryController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { validate } from '../middlewares/validate';
import { createCategoryValidator, updateCategoryValidator } from '../validators/categoryValidator';

const router = Router();

router.post('/', authMiddleware, roleMiddleware('ADMIN'), validate(createCategoryValidator), CategoryController.createCategory);
router.get('/', CategoryController.listCategories);
router.get('/:id', CategoryController.getCategoryById);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), validate(updateCategoryValidator), CategoryController.updateCategory);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), CategoryController.deleteCategory);

export default router;
