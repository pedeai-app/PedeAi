// Valores gravados em logs_auditoria.acao. Os de login sao os mesmos do PDV.
export enum AuditAction {
    LOGIN_SUCCEEDED = 'LOGIN_SUCCEEDED',
    LOGIN_FAILED = 'LOGIN_FAILED',
    LOGIN_DENIED_INACTIVE = 'LOGIN_DENIED_INACTIVE',
    ROLE_CHANGED = 'ROLE_CHANGED',
    PIN_CHANGED = 'PIN_CHANGED',
    PERMISSION_GRANTED = 'PERMISSION_GRANTED',
    PERMISSION_REVOKED = 'PERMISSION_REVOKED',
}

export enum AuditOrigin {
    API = 'API',
    PDV = 'PDV',
}
