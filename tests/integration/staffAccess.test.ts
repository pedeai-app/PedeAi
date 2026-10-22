import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Request, Response } from 'express';
import app from '../../src/app';
import { Customer } from '../../src/models/Customer';
import { AuditLog } from '../../src/models/AuditLog';
import { UserPermission } from '../../src/models/UserPermission';
import { Role } from '../../src/enum/Role';
import { Permission } from '../../src/enum/Permission';
import { AuditAction } from '../../src/enum/AuditAction';
import { CustomerStatus } from '../../src/enum/CustomerStatus';
import auditLogService from '../../src/services/auditLogService';
import permissionService from '../../src/services/permissionService';
import { requirePermission } from '../../src/middlewares/permissionMiddleware';
import { createAdmin, createCashier, createCustomer, tokenFor } from './helpers/factories';

function auth(customer: Customer) {
    return { Authorization: `Bearer ${tokenFor(customer)}` };
}

async function logsOf(action: AuditAction) {
    return AuditLog.findAll({ where: { action }, order: [['createdAt', 'ASC']] });
}

describe('Papel do usuario', () => {

    it('admin promove cliente a CASHIER e o log guarda o antes e o depois', async () => {
        const admin = await createAdmin();
        const customer = await createCustomer();

        const res = await request(app)
            .put(`/customers/${customer.id}/role`)
            .set(auth(admin))
            .send({ role: 'CASHIER' });

        expect(res.status).toBe(200);
        expect(res.body.role).toBe('CASHIER');

        const [log] = await logsOf(AuditAction.ROLE_CHANGED);
        expect(log.userId).toBe(customer.id);
        expect(log.createdBy).toBe(admin.id);
        expect(log.origin).toBe('API');
        expect(log.details).toEqual({ from: 'CUSTOMER', to: 'CASHIER' });
    });

    it('so admin troca papel', async () => {
        const cashier = await createCashier();
        const customer = await createCustomer();

        const res = await request(app)
            .put(`/customers/${customer.id}/role`)
            .set(auth(cashier))
            .send({ role: 'ADMIN' });

        expect(res.status).toBe(403);
        await customer.reload();
        expect(customer.role).toBe(Role.CUSTOMER);
    });

    it('admin nao altera o proprio papel, para ninguem se trancar fora', async () => {
        const admin = await createAdmin();

        const res = await request(app)
            .put(`/customers/${admin.id}/role`)
            .set(auth(admin))
            .send({ role: 'CUSTOMER' });

        expect(res.status).toBe(403);
        await admin.reload();
        expect(admin.role).toBe(Role.ADMIN);
    });

    it('recusa papel fora do catalogo', async () => {
        const admin = await createAdmin();
        const customer = await createCustomer();

        const res = await request(app)
            .put(`/customers/${customer.id}/role`)
            .set(auth(admin))
            .send({ role: 'OPERADOR_CAIXA' });

        expect(res.status).toBe(422);
    });

    it('rebaixar a CUSTOMER tira o PIN e as permissoes extras, e registra o que saiu', async () => {
        const admin = await createAdmin();
        const cashier = await createCashier({ pinHash: await bcrypt.hash('4821', 4) });
        await UserPermission.create({ userId: cashier.id, permission: Permission.REGISTER_PURCHASE, grantedBy: admin.id });

        const res = await request(app)
            .put(`/customers/${cashier.id}/role`)
            .set(auth(admin))
            .send({ role: 'CUSTOMER' });

        expect(res.status).toBe(200);
        const reloaded = await Customer.scope('withPin').findByPk(cashier.id);
        expect(reloaded!.pinHash).toBeNull();
        expect(await UserPermission.count({ where: { userId: cashier.id } })).toBe(0);

        const [log] = await logsOf(AuditAction.ROLE_CHANGED);
        expect(log.details).toEqual({
            from: 'CASHIER',
            to: 'CUSTOMER',
            revokedPermissions: ['REGISTER_PURCHASE'],
            pinRemoved: true,
        });
    });

    it('se o log falha, o papel nao muda: os dois entram na mesma transacao', async () => {
        const admin = await createAdmin();
        const customer = await createCustomer();
        const spy = jest.spyOn(auditLogService, 'record').mockRejectedValueOnce(new Error('falha simulada'));
        const silencio = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        try {
            const res = await request(app)
                .put(`/customers/${customer.id}/role`)
                .set(auth(admin))
                .send({ role: 'CASHIER' });

            expect(res.status).toBe(500);
        } finally {
            spy.mockRestore();
            silencio.mockRestore();
        }

        await customer.reload();
        expect(customer.role).toBe(Role.CUSTOMER);
    });
});

describe('PIN do balcao', () => {

    it('define o PIN em bcrypt, sem expor o hash e sem gravar o PIN no log', async () => {
        const admin = await createAdmin();
        const cashier = await createCashier();

        const res = await request(app)
            .put(`/customers/${cashier.id}/pin`)
            .set(auth(admin))
            .send({ pin: '0482' });

        expect(res.status).toBe(204);

        const reloaded = await Customer.scope('withPin').findByPk(cashier.id);
        expect(await bcrypt.compare('0482', reloaded!.pinHash!)).toBe(true);

        const shown = await request(app).get(`/customers/${cashier.id}`).set(auth(admin));
        expect(shown.body).not.toHaveProperty('pinHash');

        const [log] = await logsOf(AuditAction.PIN_CHANGED);
        expect(log.userId).toBe(cashier.id);
        expect(log.details).toEqual({ hadPin: false });
        expect(JSON.stringify(log.details)).not.toContain('0482');
    });

    it('cliente do site nao recebe PIN', async () => {
        const admin = await createAdmin();
        const customer = await createCustomer();

        const res = await request(app)
            .put(`/customers/${customer.id}/pin`)
            .set(auth(admin))
            .send({ pin: '1234' });

        expect(res.status).toBe(400);
    });

    it('recusa PIN de outro usuario ativo, mas aceita o de um inativo', async () => {
        const admin = await createAdmin();
        const cashier = await createCashier();
        await createCashier({ pinHash: await bcrypt.hash('5555', 4) });
        await createCashier({ pinHash: await bcrypt.hash('7777', 4), status: CustomerStatus.INACTIVE });

        const repeated = await request(app)
            .put(`/customers/${cashier.id}/pin`)
            .set(auth(admin))
            .send({ pin: '5555' });
        expect(repeated.status).toBe(409);

        const fromInactive = await request(app)
            .put(`/customers/${cashier.id}/pin`)
            .set(auth(admin))
            .send({ pin: '7777' });
        expect(fromInactive.status).toBe(204);
    });

    it.each([['123'], ['123456789'], ['12a4'], [1234]])('recusa PIN mal formado: %p', async (pin) => {
        const admin = await createAdmin();
        const cashier = await createCashier();

        const res = await request(app)
            .put(`/customers/${cashier.id}/pin`)
            .set(auth(admin))
            .send({ pin });

        expect(res.status).toBe(422);
    });
});

describe('Permissoes extras', () => {

    it('concede, lista e revoga, registrando as duas pontas', async () => {
        const admin = await createAdmin();
        const cashier = await createCashier();

        const granted = await request(app)
            .post(`/customers/${cashier.id}/permissions`)
            .set(auth(admin))
            .send({ permission: 'REGISTER_PURCHASE' });
        expect(granted.status).toBe(201);

        const listed = await request(app).get(`/customers/${cashier.id}/permissions`).set(auth(admin));
        expect(listed.status).toBe(200);
        expect(listed.body.role).toBe('CASHIER');
        expect(listed.body.fromRole).toContain('SELL');
        expect(listed.body.extra.map((e: { permission: string }) => e.permission)).toEqual(['REGISTER_PURCHASE']);
        expect(listed.body.effective).toContain('REGISTER_PURCHASE');

        const revoked = await request(app)
            .delete(`/customers/${cashier.id}/permissions/REGISTER_PURCHASE`)
            .set(auth(admin));
        expect(revoked.status).toBe(204);
        expect(await UserPermission.count()).toBe(0);

        expect(await logsOf(AuditAction.PERMISSION_GRANTED)).toHaveLength(1);
        const [log] = await logsOf(AuditAction.PERMISSION_REVOKED);
        expect(log.details).toEqual({ permission: 'REGISTER_PURCHASE' });
        expect(log.createdBy).toBe(admin.id);
    });

    it('recusa extra que ja vem do papel, extra repetida e extra para cliente', async () => {
        const admin = await createAdmin();
        const cashier = await createCashier();
        const customer = await createCustomer();
        const grant = (id: number, permission: string) =>
            request(app).post(`/customers/${id}/permissions`).set(auth(admin)).send({ permission });

        expect((await grant(cashier.id, 'SELL')).status).toBe(409);
        expect((await grant(cashier.id, 'VIEW_REPORTS')).status).toBe(201);
        expect((await grant(cashier.id, 'VIEW_REPORTS')).status).toBe(409);
        expect((await grant(customer.id, 'VIEW_REPORTS')).status).toBe(400);
        expect((await grant(cashier.id, 'NAO_EXISTE')).status).toBe(422);

        expect(await logsOf(AuditAction.PERMISSION_GRANTED)).toHaveLength(1);
    });

    it('revogar o que o usuario nao tem e 404', async () => {
        const admin = await createAdmin();
        const cashier = await createCashier();

        const res = await request(app)
            .delete(`/customers/${cashier.id}/permissions/VIEW_REPORTS`)
            .set(auth(admin));

        expect(res.status).toBe(404);
    });

    it('hasPermission soma o papel com as extras', async () => {
        const admin = await createAdmin();
        const cashier = await createCashier();
        const customer = await createCustomer();

        expect(await permissionService.hasPermission(cashier, Permission.SELL)).toBe(true);
        expect(await permissionService.hasPermission(cashier, Permission.REGISTER_PURCHASE)).toBe(false);
        expect(await permissionService.hasPermission(customer, Permission.SELL)).toBe(false);
        expect(await permissionService.hasPermission(admin, Permission.EXECUTE_PIX_REFUND)).toBe(true);

        await UserPermission.create({ userId: cashier.id, permission: Permission.REGISTER_PURCHASE, grantedBy: admin.id });
        expect(await permissionService.hasPermission(cashier, Permission.REGISTER_PURCHASE)).toBe(true);
    });
});

describe('requirePermission', () => {

    function fakeResponse() {
        const res = { statusCode: 200, status: jest.fn(), json: jest.fn() };
        res.status.mockImplementation((code: number) => {
            res.statusCode = code;
            return res;
        });
        return res;
    }

    async function run(user: { id: number; role: string }, permission: Permission) {
        const req = { user } as unknown as Request;
        const res = fakeResponse();
        const next = jest.fn();
        await requirePermission(permission)(req, res as unknown as Response, next);
        return { status: next.mock.calls.length ? 'next' : res.statusCode };
    }

    it('le o papel do banco, nao do token', async () => {
        const demoted = await createCustomer();

        // Token antigo ainda diz ADMIN; o banco diz CUSTOMER.
        expect(await run({ id: demoted.id, role: 'ADMIN' }, Permission.VIEW_REPORTS)).toEqual({ status: 403 });
    });

    it('deixa passar quem tem a permissao e barra quem foi desativado', async () => {
        const cashier = await createCashier();
        const inactive = await createAdmin({ status: CustomerStatus.INACTIVE });

        expect(await run({ id: cashier.id, role: 'CASHIER' }, Permission.SELL)).toEqual({ status: 'next' });
        expect(await run({ id: inactive.id, role: 'ADMIN' }, Permission.SELL)).toEqual({ status: 401 });
    });
});
