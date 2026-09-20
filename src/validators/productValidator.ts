import { body, param } from "express-validator";

export const productIdValidator = [
    param("id")
        .isInt({ gt: 0 }).withMessage("O id deve ser um número inteiro válido."),
];

export const createProductValidator = [
    body("name")
        .trim()
        .notEmpty().withMessage("O nome é obrigatório.")
        .isLength({ min: 2, max: 255 }).withMessage("O nome deve ter entre 2 e 255 caracteres."),

    body("description")
        .optional()
        .trim()
        .isString().withMessage("A descrição deve ser um texto."),

    body("price")
        .notEmpty().withMessage("O preço é obrigatório.")
        .isFloat({ gt: 0 }).withMessage("O preço deve ser um número maior que zero."),

    body("stock")
        .optional()
        .isInt({ min: 0 }).withMessage("O estoque deve ser um número inteiro maior ou igual a zero."),

    body("imageUrl")
        .optional()
        .trim()
        .isURL().withMessage("A imagem deve ser uma URL válida."),

    body("active")
        .optional()
        .isBoolean().withMessage("O campo ativo deve ser verdadeiro ou falso."),

    body("categoryId")
        .optional({ nullable: true })
        .isInt({ min: 1 }).withMessage("A categoria deve ser um id válido."),
];

export const updateProductValidator = [
    body("name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 255 }).withMessage("O nome deve ter entre 2 e 255 caracteres."),

    body("description")
        .optional()
        .trim()
        .isString().withMessage("A descrição deve ser um texto."),

    body("price")
        .optional()
        .isFloat({ gt: 0 }).withMessage("O preço deve ser um número maior que zero."),

    body("stock")
        .optional()
        .isInt({ min: 0 }).withMessage("O estoque deve ser um número inteiro maior ou igual a zero."),

    body("imageUrl")
        .optional()
        .trim()
        .isURL().withMessage("A imagem deve ser uma URL válida."),

    body("active")
        .optional()
        .isBoolean().withMessage("O campo ativo deve ser verdadeiro ou falso."),

    body("categoryId")
        .optional({ nullable: true })
        .isInt({ min: 1 }).withMessage("A categoria deve ser um id válido."),
];
