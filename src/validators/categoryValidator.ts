import { body } from "express-validator";

export const createCategoryValidator = [
    body("name")
        .trim()
        .notEmpty().withMessage("O nome é obrigatório.")
        .isLength({ min: 2, max: 100 }).withMessage("O nome deve ter entre 2 e 100 caracteres."),

    body("active")
        .optional()
        .isBoolean().withMessage("O campo ativo deve ser verdadeiro ou falso."),
];

export const updateCategoryValidator = [
    body("name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage("O nome deve ter entre 2 e 100 caracteres."),

    body("active")
        .optional()
        .isBoolean().withMessage("O campo ativo deve ser verdadeiro ou falso."),
];
