'use strict';

/**
 * Log de auditoria: login, alteracao de configuracao, acao negada. Nasce na API
 * e no PDV, por isso o id e UUID gerado na origem (o PDV manda o seu). So
 * recebe INSERT — nao tem updatedAt.
 *
 * As FKs para `clientes` nao cascateiam: cadastro nao se apaga (vira INATIVO), e
 * um DELETE que tentasse levar o historico junto deve falhar.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('logs_auditoria', {
            id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
            usuarioId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: 'clientes', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'NO ACTION',
            },
            acao: { type: Sequelize.STRING(60), allowNull: false },
            detalhes: { type: Sequelize.JSONB, allowNull: true },
            criadoPor: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: 'clientes', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'NO ACTION',
            },
            origem: { type: Sequelize.ENUM('API', 'PDV'), allowNull: false, defaultValue: 'API' },
            createdAt: { type: Sequelize.DATE, allowNull: false },
        });

        await queryInterface.addIndex('logs_auditoria', ['usuarioId', 'createdAt'], {
            name: 'logs_auditoria_usuario_data',
        });
        await queryInterface.addIndex('logs_auditoria', ['createdAt'], {
            name: 'logs_auditoria_data',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('logs_auditoria');

        // dropTable nao remove o tipo ENUM que o createTable criou.
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_logs_auditoria_origem";');
    },
};
