import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { LIMITES } from "../services/imagemProdutoService";

// Em memoria, e nao em disco: sao dois arquivos pequenos que vao direto para o R2,
// e o disco do container e descartado quando ele dorme.
const receber = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: LIMITES.grande.maxBytes,
        files: 2,
        fields: 0,
    },
}).fields([
    { name: "grande", maxCount: 1 },
    { name: "miniatura", maxCount: 1 },
]);

const MENSAGENS: Record<string, string> = {
    LIMIT_FILE_SIZE: `A foto passa de ${LIMITES.grande.maxBytes / 1024} KB.`,
    LIMIT_FILE_COUNT: "Envie só a foto grande e a miniatura.",
    LIMIT_FIELD_COUNT: "Envie só a foto grande e a miniatura.",
    LIMIT_UNEXPECTED_FILE: "Campos aceitos: grande e miniatura.",
};

/**
 * Le o multipart com os dois tamanhos da foto (campos `grande` e `miniatura`).
 * Erros do multer viram 422 com mensagem, no mesmo formato das outras validacoes.
 */
export function uploadImagemProduto(req: Request, res: Response, next: NextFunction) {
    receber(req, res, (erro: unknown) => {
        if (!erro) return next();
        if (erro instanceof multer.MulterError) {
            return res.status(422).json({ message: MENSAGENS[erro.code] ?? "Envio da foto inválido." });
        }
        // Corpo que nao e multipart, ou multipart quebrado.
        return res.status(422).json({ message: "Envie a foto como multipart/form-data." });
    });
}
