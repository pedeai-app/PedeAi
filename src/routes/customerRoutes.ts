import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { validate } from '../middlewares/validate';
import {
    updateCustomerValidator,
    idParamValidator,
} from '../validators/customerValidator';

const router = Router();
const customerController = new CustomerController();

router.use(authMiddleware, roleMiddleware('ADMIN'));

// Nao existe POST: quem cria cliente e o proprio cliente, por /auth/register,
// que trata email e hash de senha. Ver ADR no PR que removeu esta rota.
router.get('/', customerController.listCustomers);
router.get('/:id', validate(idParamValidator), customerController.getCustomerById);
router.put('/:id', validate(updateCustomerValidator), customerController.updateCustomer);
router.post('/:id/resetar-senha', validate(idParamValidator), customerController.resetPassword);
router.post('/:id/reativar', validate(idParamValidator), customerController.reactivateCustomer);

// Desativa em vez de apagar: as FKs de carrinhos e pedidos sao ON DELETE CASCADE.
router.delete('/:id', validate(idParamValidator), customerController.deactivateCustomer);


export default router;
