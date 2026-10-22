import { Role } from './Role';

// Catalogo do que se pode fazer na gestao. Os mesmos valores valem no PDV, que
// recebe as permissoes extras na sincronizacao — por isso so se acrescenta valor,
// nunca se renomeia.
export enum Permission {
    OPEN_CASH_SESSION = 'OPEN_CASH_SESSION',
    SELL = 'SELL',
    CASH_MOVEMENTS = 'CASH_MOVEMENTS',
    VIEW_EXPECTED_CASH = 'VIEW_EXPECTED_CASH',
    RETURN_OPEN_SESSION_SALE = 'RETURN_OPEN_SESSION_SALE',
    RETURN_CLOSED_SESSION_SALE = 'RETURN_CLOSED_SESSION_SALE',
    REGISTER_PURCHASE = 'REGISTER_PURCHASE',
    MANAGE_REGISTRATIONS = 'MANAGE_REGISTRATIONS',
    EXECUTE_PIX_REFUND = 'EXECUTE_PIX_REFUND',
    VIEW_REPORTS = 'VIEW_REPORTS',
}

// O que cada papel ja traz. Os papeis ficam no codigo (sao so tres); o que passa
// disso e concedido por usuario em `permissoes_usuario`.
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
    [Role.ADMIN]: Object.values(Permission),
    [Role.CASHIER]: [
        Permission.OPEN_CASH_SESSION,
        Permission.SELL,
        Permission.CASH_MOVEMENTS,
        Permission.VIEW_EXPECTED_CASH,
        Permission.RETURN_OPEN_SESSION_SALE,
    ],
    [Role.CUSTOMER]: [],
};
