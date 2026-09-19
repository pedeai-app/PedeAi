import { body, param } from "express-validator";

export const addProductValidator = [
    body("produtoId")
        .notEmpty().withMessage("O produtoId é obrigatório.")
        .isInt({ gt: 0 }).withMessage("O produtoId deve ser um número inteiro válido."),

    body("quantidade")
        .notEmpty().withMessage("A quantidade é obrigatória.")
        .isInt({ gt: 0 }).withMessage("A quantidade deve ser um número inteiro maior que zero."),
];

export const cartItemParamValidator = [
    param("itemId")
        .isInt({ gt: 0 }).withMessage("O itemId deve ser um número inteiro válido."),
];
