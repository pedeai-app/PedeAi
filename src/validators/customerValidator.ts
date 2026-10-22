import { body, param } from "express-validator";
import { Role } from "../enum/Role";
import { Permission } from "../enum/Permission";

// Atualizacao parcial: todo campo e opcional, mas o que vier precisa ser valido.
export const updateCustomerValidator = [
    param("id")
        .isInt({ gt: 0 }).withMessage("O id deve ser um número inteiro válido."),

    body("name")
        .optional()
        .trim()
        .isLength({ min: 3, max: 150 }).withMessage("O nome deve ter entre 3 e 150 caracteres."),

    body("cpf")
        .optional()
        .trim()
        .matches(/^\d{11}$/).withMessage("O CPF deve conter exatamente 11 dígitos numéricos."),

    body("phone")
        .optional()
        .trim()
        .matches(/^\d{10,11}$/).withMessage("O telefone deve conter 10 ou 11 dígitos numéricos."),

    body("address")
        .optional()
        .trim()
        .notEmpty().withMessage("O endereço não pode ser vazio."),
];

export const idParamValidator = [
    param("id")
        .isInt({ gt: 0 }).withMessage("O id deve ser um número inteiro válido."),
];

const idParam = param("id")
    .isInt({ gt: 0 }).withMessage("O id deve ser um número inteiro válido.");

const PERMISSIONS = Object.values(Permission);

export const changeRoleValidator = [
    idParam,
    body("role")
        .isIn(Object.values(Role)).withMessage(`O papel deve ser um de: ${Object.values(Role).join(", ")}.`),
];

// So digitos: o PDV tem teclado numerico. 4 a 8 cabe num balcao sem virar senha.
export const setPinValidator = [
    idParam,
    body("pin")
        .isString().withMessage("O PIN deve ser texto, para preservar zeros à esquerda.")
        .matches(/^\d{4,8}$/).withMessage("O PIN deve ter de 4 a 8 dígitos."),
];

export const grantPermissionValidator = [
    idParam,
    body("permission")
        .isIn(PERMISSIONS).withMessage(`Permissão inválida. Use uma de: ${PERMISSIONS.join(", ")}.`),
];

export const revokePermissionValidator = [
    idParam,
    param("permission")
        .isIn(PERMISSIONS).withMessage(`Permissão inválida. Use uma de: ${PERMISSIONS.join(", ")}.`),
];
