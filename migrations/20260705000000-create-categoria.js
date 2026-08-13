'use strict';

/**
 * Cria a tabela de categorias e adiciona a FK categoriaId em produtos.
 * A FK e nullable para nao quebrar produtos ja existentes; onDelete SET NULL
 * mantem o produto caso a categoria seja removida.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const timestamps = {
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false },
        };

        await queryInterface.createTable('categorias', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            nome: { type: Sequelize.STRING(100), allowNull: false, unique: true },
            ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            ...timestamps,
        });

        await queryInterface.addColumn('produtos', 'categoriaId', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'categorias', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('produtos', 'categoriaId');
        await queryInterface.dropTable('categorias');
    },
};
