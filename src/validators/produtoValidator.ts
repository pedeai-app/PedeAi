import { body } from "express-validator";

export const criarProdutoValidator = [
    body("nome")
        .trim()
        .notEmpty().withMessage("O nome é obrigatório.")
        .isLength({ min: 2, max: 255 }).withMessage("O nome deve ter entre 2 e 255 caracteres."),

    body("descricao")
        .optional()
        .trim()
        .isString().withMessage("A descrição deve ser um texto."),

    body("preco")
        .notEmpty().withMessage("O preço é obrigatório.")
        .isFloat({ gt: 0 }).withMessage("O preço deve ser um número maior que zero."),

    body("estoque")
        .optional()
        .isInt({ min: 0 }).withMessage("O estoque deve ser um número inteiro maior ou igual a zero."),

    body("imagemUrl")
        .optional()
        .trim()
        .isURL().withMessage("A imagem deve ser uma URL válida."),

    body("ativo")
        .optional()
        .isBoolean().withMessage("O campo ativo deve ser verdadeiro ou falso."),

    body("categoriaId")
        .optional({ nullable: true })
        .isInt({ min: 1 }).withMessage("A categoria deve ser um id válido."),
];

export const atualizarProdutoValidator = [
    body("nome")
        .optional()
        .trim()
        .isLength({ min: 2, max: 255 }).withMessage("O nome deve ter entre 2 e 255 caracteres."),

    body("descricao")
        .optional()
        .trim()
        .isString().withMessage("A descrição deve ser um texto."),

    body("preco")
        .optional()
        .isFloat({ gt: 0 }).withMessage("O preço deve ser um número maior que zero."),

    body("estoque")
        .optional()
        .isInt({ min: 0 }).withMessage("O estoque deve ser um número inteiro maior ou igual a zero."),

    body("imagemUrl")
        .optional()
        .trim()
        .isURL().withMessage("A imagem deve ser uma URL válida."),

    body("ativo")
        .optional()
        .isBoolean().withMessage("O campo ativo deve ser verdadeiro ou falso."),

    body("categoriaId")
        .optional({ nullable: true })
        .isInt({ min: 1 }).withMessage("A categoria deve ser um id válido."),
];
