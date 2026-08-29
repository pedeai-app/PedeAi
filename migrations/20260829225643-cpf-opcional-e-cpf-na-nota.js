'use strict';

/**
 * Tira a obrigatoriedade do CPF no cadastro e move o dado para a venda.
 *
 * O CPF deixava o cadastro com seis campos obrigatorios so para tomar um
 * pedido, e um erro de digitacao queimava aquele numero para sempre. Ele passa
 * a ser pedido no checkout ("CPF na nota?"), gravado no proprio pedido: e dado
 * fiscal daquela venda, e cada pedido pode levar um CPF diferente.
 *
 * O UNIQUE de clientes.cpf continua: no Postgres uma coluna unica aceita varios
 * NULL, entao quem informar segue protegido contra duplicidade.
 *
 * Os dois lados rodam dentro de uma transacao. O Postgres tem DDL transacional,
 * entao ou as duas alteracoes valem ou nenhuma vale — sem isso, uma falha no
 * meio deixa o banco num estado que a SequelizeMeta nao descreve.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.changeColumn('clientes', 'cpf', {
                type: Sequelize.STRING(11),
                allowNull: true,
            }, { transaction });

            await queryInterface.addColumn('pedidos', 'cpfNota', {
                type: Sequelize.STRING(11),
                allowNull: true,
            }, { transaction });
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            // A checagem vem ANTES de qualquer DDL: nao da para restaurar o
            // NOT NULL inventando CPF de quem se cadastrou sem ele, e abortar
            // depois de ja ter mexido no schema deixaria trabalho pela metade.
            const [linhas] = await queryInterface.sequelize.query(
                'SELECT COUNT(*)::int AS total FROM clientes WHERE cpf IS NULL;',
                { transaction },
            );

            if (linhas[0].total > 0) {
                throw new Error(
                    `Existem ${linhas[0].total} cliente(s) sem CPF. ` +
                    'Preencha ou remova esses cadastros antes de desfazer esta migration.',
                );
            }

            await queryInterface.removeColumn('pedidos', 'cpfNota', { transaction });

            await queryInterface.changeColumn('clientes', 'cpf', {
                type: Sequelize.STRING(11),
                allowNull: false,
            }, { transaction });
        });
    },
};
