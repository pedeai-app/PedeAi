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

            const cliente = await authService.register(
                nome,
                cpf,
                telefone,
                endereco,
                email,
                senha
            );

            return res.status(201).json(cliente);
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

            const resultado = await authService.login(
                email,
                senha
            );
            return res.json(resultado);
        } catch (error: any) {

            return res.status(401).json({
                message: error.message
            }); 
        }
    
    }

    async trocarSenha (req: Request, res: Response) {

        try {
            const { senhaAtual, novaSenha } = req.body;

            // O dono vem do token, nunca do corpo: ninguem troca a senha alheia.
            const resultado = await authService.trocarSenha(
                req.user!.id,
                senhaAtual,
                novaSenha
            );

            return res.json(resultado);
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
