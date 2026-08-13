import { Router } from 'express';
import CategoriaController from '../controllers/categoriaController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { validate } from '../middlewares/validate';
import { criarCategoriaValidator, atualizarCategoriaValidator } from '../validators/categoriaValidator';

const router = Router();

router.post('/', authMiddleware, roleMiddleware('ADMIN'), validate(criarCategoriaValidator), CategoriaController.criarCategoria);
router.get('/', CategoriaController.listarCategorias);
router.get('/:id', CategoriaController.obterCategoriaPorId);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), validate(atualizarCategoriaValidator), CategoriaController.atualizarCategoria);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), CategoriaController.deletarCategoria);

export default router;
