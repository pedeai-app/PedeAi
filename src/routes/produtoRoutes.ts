import { Router } from 'express';
import ProdutoController from '../controllers/produtoController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { validate } from '../middlewares/validate';
import { criarProdutoValidator, atualizarProdutoValidator, idProdutoValidator } from '../validators/produtoValidator';
import { uploadImagemProduto } from '../middlewares/uploadImagemProduto';

const router = Router();

router.post('/', authMiddleware, roleMiddleware('ADMIN'), validate(criarProdutoValidator), ProdutoController.criarProduto);
router.get('/', ProdutoController.listarProdutos);
router.get('/:id', ProdutoController.obterProdutoPorId);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), validate(atualizarProdutoValidator), ProdutoController.atualizarProduto);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), ProdutoController.deletarProduto);

// Foto do produto. O upload vem depois da checagem de ADMIN de proposito: quem nao
// pode enviar e recusado antes de o servidor ler megabytes de corpo.
router.put('/:id/imagem', authMiddleware, roleMiddleware('ADMIN'), validate(idProdutoValidator), uploadImagemProduto, ProdutoController.definirImagem);
router.delete('/:id/imagem', authMiddleware, roleMiddleware('ADMIN'), validate(idProdutoValidator), ProdutoController.removerImagem);

export default router;
