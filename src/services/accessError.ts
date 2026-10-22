/**
 * Falha de regra de papel, PIN ou permissao. O service diz o motivo; o
 * controller escolhe o status (ver ACCESS_ERROR_STATUS no customerController).
 */
export type AccessErrorReason = "NOT_FOUND" | "INVALID" | "CONFLICT" | "FORBIDDEN";

export class AccessError extends Error {
    constructor(readonly reason: AccessErrorReason, mensagem: string) {
        super(mensagem);
    }
}
