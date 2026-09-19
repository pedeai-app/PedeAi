import { Request, Response } from "express";
import authService from "../services/authService";

class AuthController { 

    async register (req: Request, res: Response){

        try { 
            const{
                nome, 
                cpf,
                telefone,
                endereco,
                email, 
                senha
            } = req.body;

            const customer = await authService.register(
                nome,
                cpf,
                telefone,
                endereco,
                email,
                senha
            );

            return res.status(201).json(customer);
        } catch (error: any){ 

            return res.status(400).json({
                message: error.message
            }); 
        }
    }

    async login(req: Request, res: Response){
        try { 

            const {
                email,
                senha
            } = req.body; 

            const result = await authService.login(
                email,
                senha
            );
            return res.json(result);
        } catch (error: any) {

            return res.status(401).json({
                message: error.message
            }); 
        }
    
    }

    async changePassword (req: Request, res: Response) {

        try {
            // As chaves do corpo continuam em portugues: sao contrato com o app.
            const { senhaAtual: currentPassword, novaSenha: newPassword } = req.body;

            // O dono vem do token, nunca do corpo: ninguem troca a senha alheia.
            const result = await authService.changePassword(
                req.user!.id,
                currentPassword,
                newPassword
            );

            return res.json(result);
        } catch (error: any) {

            return res.status(400).json({
                message: error.message
            });
        }
    }

    async profile (req: Request, res: Response) {

        return res.json({
            message: 'Acesso autorizado',
            user: req.user
        });
    }
}

export default new AuthController();
