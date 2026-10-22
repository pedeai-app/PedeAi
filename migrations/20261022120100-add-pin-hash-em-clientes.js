'use strict';

/**
 * PIN de quem trabalha no balcao, em bcrypt. Fica em `clientes` porque o
 * papel ja mora la (ADMIN, CUSTOMER, CASHIER). Nulo para cliente do site.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('clientes', 'pinHash', {
            type: Sequelize.STRING,
            allowNull: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('clientes', 'pinHash');
    },
};
