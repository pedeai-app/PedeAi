'use strict';

/**
 * Marca contas cuja senha foi redefinida pelo lojista.
 *
 * O reset devolve uma senha temporaria que o lojista repassa ao cliente pelo
 * WhatsApp — ou seja, ele conhece a senha. A flag existe para que isso valha
 * por um login so: enquanto ela estiver ligada, o app obriga a troca.
 *
 * Default false para as contas existentes, que tem senha escolhida pelo dono.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('clientes', 'senhaTemporaria', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('clientes', 'senhaTemporaria');
    },
};
