import { body, param } from "express-validator";

// Atualizacao parcial: todo campo e opcional, mas o que vier precisa ser valido.
export const atualizarClienteValidator = [
    param("id")
        .isInt({ gt: 0 }).withMessage("O id deve ser um número inteiro válido."),

    body("nome")
        .optional()
        .trim()
        .isLength({ min: 3, max: 150 }).withMessage("O nome deve ter entre 3 e 150 caracteres."),

    body("cpf")
        .optional()
        .trim()
        .matches(/^\d{11}$/).withMessage("O CPF deve conter exatamente 11 dígitos numéricos."),

    body("telefone")
        .optional()
        .trim()
        .matches(/^\d{10,11}$/).withMessage("O telefone deve conter 10 ou 11 dígitos numéricos."),

    body("endereco")
        .optional()
        .trim()
        .notEmpty().withMessage("O endereço não pode ser vazio."),
];

export const idParamValidator = [
    param("id")
        .isInt({ gt: 0 }).withMessage("O id deve ser um número inteiro válido."),
];
