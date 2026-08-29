'use strict';

/**
 * Registra no pedido o nome e o endereco de entrega vigentes no fechamento,
 * preservando o historico mesmo quando o cadastro do cliente for alterado.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('pedidos', 'nomeCliente', {
            type: Sequelize.STRING(150),
            allowNull: true,
        });

        await queryInterface.addColumn('pedidos', 'enderecoEntrega', {
            type: Sequelize.STRING,
            allowNull: true,
        });

        await queryInterface.sequelize.query(`
            UPDATE pedidos p
            SET "nomeCliente" = c.nome,
                "enderecoEntrega" = c.endereco
            FROM clientes c
            WHERE c.id = p."clienteId";
        `);

        await queryInterface.changeColumn('pedidos', 'nomeCliente', {
            type: Sequelize.STRING(150),
            allowNull: false,
        });

        await queryInterface.changeColumn('pedidos', 'enderecoEntrega', {
            type: Sequelize.STRING,
            allowNull: false,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('pedidos', 'enderecoEntrega');
        await queryInterface.removeColumn('pedidos', 'nomeCliente');
    },
};
