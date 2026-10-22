'use strict';

/**
 * Acrescenta CASHIER ao papel: o operador do balcao, que entra no PDV por PIN.
 *
 * O Postgres nao remove valor de ENUM. O `down` recria o tipo sem CASHIER e,
 * se ainda houver alguem com esse papel, falha em vez de rebaixar a pessoa em
 * silencio — quem desfaz decide o que fazer com esses cadastros.
 */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            `ALTER TYPE "enum_clientes_role" ADD VALUE IF NOT EXISTS 'CASHIER';`,
        );
    },

    async down(queryInterface) {
        const [[{ total }]] = await queryInterface.sequelize.query(
            `SELECT COUNT(*)::int AS total FROM clientes WHERE role = 'CASHIER';`,
        );

        if (total > 0) {
            throw new Error(
                `${total} cadastro(s) com papel CASHIER. Troque o papel deles antes de desfazer esta migration.`,
            );
        }

        await queryInterface.sequelize.transaction(async (transaction) => {
            const query = (sql) => queryInterface.sequelize.query(sql, { transaction });

            await query(`ALTER TABLE clientes ALTER COLUMN role DROP DEFAULT;`);
            await query(`ALTER TYPE "enum_clientes_role" RENAME TO "enum_clientes_role_antigo";`);
            await query(`CREATE TYPE "enum_clientes_role" AS ENUM ('ADMIN', 'CUSTOMER');`);
            await query(
                `ALTER TABLE clientes ALTER COLUMN role TYPE "enum_clientes_role" USING role::text::"enum_clientes_role";`,
            );
            await query(`ALTER TABLE clientes ALTER COLUMN role SET DEFAULT 'CUSTOMER';`);
            await query(`DROP TYPE "enum_clientes_role_antigo";`);
        });
    },
};
