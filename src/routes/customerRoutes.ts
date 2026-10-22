import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { validate } from '../middlewares/validate';
import {
    updateCustomerValidator,
    idParamValidator,
    changeRoleValidator,
    setPinValidator,
    grantPermissionValidator,
    revokePermissionValidator,
} from '../validators/customerValidator';
import { Role } from '../enum/Role';

const router = Router();
const customerController = new CustomerController();

router.use(authMiddleware, roleMiddleware(Role.ADMIN));

// Nao existe POST: quem cria cliente e o proprio cliente, por /auth/register,
// que trata email e hash de senha. Ver ADR no PR que removeu esta rota.
router.get('/', customerController.listCustomers);
router.get('/:id', validate(idParamValidator), customerController.getCustomerById);
router.put('/:id', validate(updateCustomerValidator), customerController.updateCustomer);
router.post('/:id/reset-password', validate(idParamValidator), customerController.resetPassword);
router.post('/:id/reactivate', validate(idParamValidator), customerController.reactivateCustomer);

// Papel, PIN e permissoes: configuracao de quem trabalha na loja. Toda mudanca
// grava em logs_auditoria na mesma transacao.
router.put('/:id/role', validate(changeRoleValidator), customerController.changeRole);
router.put('/:id/pin', validate(setPinValidator), customerController.setPin);
router.get('/:id/permissions', validate(idParamValidator), customerController.listPermissions);
router.post('/:id/permissions', validate(grantPermissionValidator), customerController.grantPermission);
router.delete('/:id/permissions/:permission', validate(revokePermissionValidator), customerController.revokePermission);

// Desativa em vez de apagar: as FKs de carrinhos e pedidos sao ON DELETE CASCADE.
router.delete('/:id', validate(idParamValidator), customerController.deactivateCustomer);


export default router;
