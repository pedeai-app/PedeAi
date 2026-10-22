import path from 'path';
import { QueryTypes, Sequelize } from 'sequelize';
import { sequelize } from '../../src/config/database';
import { createCashier, createCustomer } from './helpers/factories';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const migration = require(path.resolve(__dirname, '..', '..', 'migrations', '20261022120000-add-caixa-no-enum-role.js'));

async function roleValues(): Promise<string[]> {
    const rows = await sequelize.query<{ value: string }>(
        `SELECT unnest(enum_range(NULL::"enum_clientes_role"))::text AS value`,
        { type: QueryTypes.SELECT },
    );
    return rows.map((row) => row.value);
}

describe('Migration do papel CASHIER', () => {

    it('o down recusa desfazer enquanto houver CASHIER', async () => {
        await createCashier();

        await expect(migration.down(sequelize.getQueryInterface(), Sequelize)).rejects.toThrow(/CASHIER/);
        expect(await roleValues()).toContain('CASHIER');
    });

    it('down e up de ida e volta, preservando quem ja existe', async () => {
        const customer = await createCustomer();

        await migration.down(sequelize.getQueryInterface(), Sequelize);
        expect(await roleValues()).toEqual(['ADMIN', 'CUSTOMER']);

        await migration.up(sequelize.getQueryInterface(), Sequelize);
        expect(await roleValues()).toEqual(['ADMIN', 'CUSTOMER', 'CASHIER']);

        await customer.reload();
        expect(customer.role).toBe('CUSTOMER');
        expect(await createCashier()).toBeDefined();
    });
});
