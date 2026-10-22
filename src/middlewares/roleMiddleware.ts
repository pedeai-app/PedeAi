import { Request, Response, NextFunction } from "express";
import { Role } from "../enum/Role";

export function roleMiddleware(role: Role){

    return(
        req: Request,
        res: Response,
        next: NextFunction
    ) => { 
        if (!req.user){
            return res.status(401).json({
                message: 'Usuario não autenticado.'
            });
        }

        if (req.user.role !== role){
            return res.status(403).json({
                message: 'Acesso negado'
            });
        }
        next();
    };
}