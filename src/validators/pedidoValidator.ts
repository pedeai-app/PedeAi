import { body, param, query } from "express-validator";
import { StatusPedido } from "../enum/StatusPedido";

export const pedidoIdParamValidator = [
    param("pedidoId")
        .isInt({ gt: 0 }).withMessage("O pedidoId deve ser um número inteiro válido."),
];

export const atualizarStatusValidator = [
    param("pedidoId")
        .isInt({ gt: 0 }).withMessage("O pedidoId deve ser um número inteiro válido."),

    body("status")
        .notEmpty().withMessage("O status é obrigatório.")
        .isIn(Object.values(StatusPedido))
        .withMessage(`O status deve ser um dos valores: ${Object.values(StatusPedido).join(", ")}.`),
];

export const listarPedidosValidator = [
    query("status")
        .optional()
        .isIn(Object.values(StatusPedido))
        .withMessage(`O status deve ser um dos valores: ${Object.values(StatusPedido).join(", ")}.`),

    query("clienteId")
        .optional()
        .isInt({ min: 1 })
        .withMessage("O clienteId deve ser um id válido."),
];
