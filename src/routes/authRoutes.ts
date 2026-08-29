import { Router } from "express";
import authController from "../controllers/authController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { roleMiddleware } from "../middlewares/roleMiddleware";
import { validate } from "../middlewares/validate";
import { loginLimiter, registerLimiter } from "../middlewares/rateLimiter";
import { registerValidator, loginValidator, trocarSenhaValidator } from "../validators/authValidator";

const router = Router();

router.post('/register', registerLimiter, validate(registerValidator), authController.register);
router.post('/login', loginLimiter, validate(loginValidator), authController.login);
router.post('/trocar-senha', authMiddleware, validate(trocarSenhaValidator), authController.trocarSenha);
router.get('/profile', authMiddleware, authController.profile)
router.get('/admin', authMiddleware, roleMiddleware('ADMIN'), (req, res) => { return res.json({message: 'Area administrativa'});});

export default router;
