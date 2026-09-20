import { body } from "express-validator";

export const registerValidator = [
    body("name")
        .trim()
        .notEmpty().withMessage("O nome é obrigatório.")
        .isLength({ min: 3, max: 150 }).withMessage("O nome deve ter entre 3 e 150 caracteres."),

    // Opcional no cadastro: o CPF e pedido no checkout, para a nota. Quando vier
    // preenchido o formato continua valendo; string vazia conta como ausente.
    body("cpf")
        .optional({ values: "falsy" })
        .trim()
        .matches(/^\d{11}$/).withMessage("O CPF deve conter exatamente 11 dígitos numéricos."),

    body("phone")
        .trim()
        .notEmpty().withMessage("O telefone é obrigatório.")
        .matches(/^\d{10,11}$/).withMessage("O telefone deve conter 10 ou 11 dígitos numéricos."),

    body("address")
        .trim()
        .notEmpty().withMessage("O endereço é obrigatório."),

    body("email")
        .trim()
        .notEmpty().withMessage("O email é obrigatório.")
        .isEmail().withMessage("Email inválido.")
        .normalizeEmail(),

    body("password")
        .notEmpty().withMessage("A senha é obrigatória.")
        .isLength({ min: 6 }).withMessage("A senha deve ter no mínimo 6 caracteres."),
];

export const changePasswordValidator = [
    body("currentPassword")
        .notEmpty().withMessage("A senha atual é obrigatória."),

    body("newPassword")
        .notEmpty().withMessage("A nova senha é obrigatória.")
        .isLength({ min: 6 }).withMessage("A senha deve ter no mínimo 6 caracteres."),
];

export const loginValidator = [
    body("email")
        .trim()
        .notEmpty().withMessage("O email é obrigatório.")
        .isEmail().withMessage("Email inválido.")
        .normalizeEmail(),

    body("password")
        .notEmpty().withMessage("A senha é obrigatória."),
];
