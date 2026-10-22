'use strict';

/**
 * Permissoes extras por usuario, alem das que o papel ja traz. Nasce so na API
 * (o ADMIN concede pelo painel), entao o id e inteiro. `permissao` e texto, nao
 * ENUM: o catalogo cresce a cada fase, e acrescentar valor a ENUM do Postgres
 * custa uma migration a mais. O codigo valida contra o enum Permission.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('permissoes_usuario', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
            usuarioId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'clientes', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            permissao: { type: Sequelize.STRING(50), allowNull: false },
            concedidaPor: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: 'clientes', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false },
        });

        await queryInterface.addIndex('permissoes_usuario', ['usuarioId', 'permissao'], {
            unique: true,
            name: 'permissoes_usuario_usuario_permissao_unico',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('permissoes_usuario');
    },
};
