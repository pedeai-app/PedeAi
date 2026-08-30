'use strict';

/**
 * Da um ciclo de vida ao cliente: ATIVO, INATIVO ou ANONIMIZADO.
 *
 * Ate aqui a unica forma de tirar um cliente do ar era o DELETE, e as FKs de
 * `carrinhos` e `pedidos` sao ON DELETE CASCADE — apagar o cadastro levava junto
 * o historico de vendas, que e dado fiscal. Com a coluna, o DELETE vira
 * desativacao e o pedido continua de pe.
 *
 * O ENUM ja nasce com ANONIMIZADO, mesmo sem ninguem gravar esse valor hoje.
 * Adicionar rotulo depois exige `ALTER TYPE ... ADD VALUE`, que no Postgres nao
 * roda dentro de uma transacao — o valor extra custa zero agora e evita uma
 * migration desconfortavel quando a anonimizacao de fato for implementada.
 *
 * Todo mundo que ja existe vira ATIVO: e o comportamento atual, onde qualquer
 * cadastro no banco pode logar e aparece na listagem.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('clientes', 'status', {
            type: Sequelize.ENUM('ATIVO', 'INATIVO', 'ANONIMIZADO'),
            allowNull: false,
            defaultValue: 'ATIVO',
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('clientes', 'status');

        // removeColumn nao remove o tipo ENUM que o addColumn criou. Sem este
        // DROP, reaplicar a migration estoura com "type already exists".
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_clientes_status";');
    },
};
