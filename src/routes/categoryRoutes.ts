import { Router } from 'express';
import CategoryController from '../controllers/categoryController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { validate } from '../middlewares/validate';
import { createCategoryValidator, updateCategoryValidator } from '../validators/categoryValidator';
import { Role } from '../enum/Role';

const router = Router();

router.post('/', authMiddleware, roleMiddleware(Role.ADMIN), validate(createCategoryValidator), CategoryController.createCategory);
router.get('/', CategoryController.listCategories);
router.get('/:id', CategoryController.getCategoryById);
router.put('/:id', authMiddleware, roleMiddleware(Role.ADMIN), validate(updateCategoryValidator), CategoryController.updateCategory);
router.delete('/:id', authMiddleware, roleMiddleware(Role.ADMIN), CategoryController.deleteCategory);

export default router;
