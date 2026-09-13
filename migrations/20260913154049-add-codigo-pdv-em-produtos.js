'use strict';

/**
 * Da a cada produto o codigo que ele tem no sistema de PDV da loja.
 *
 * O catalogo passa a vir de uma exportacao do PDV, e o PDV continua sendo onde
 * o lojista mexe em preco e estoque. A proxima exportacao precisa ATUALIZAR os
 * produtos que ja existem, e para isso cada linha do CSV tem que casar com uma
 * linha da tabela. Nome nao serve de chave: a primeira exportacao ja traz dois
 * "CERVEJA MOINHO REAL" e dois "SURF", com codigos diferentes no PDV.
 *
 * Nulavel porque produtos cadastrados a mao pelo admin nao tem codigo no PDV.
 * O indice unico aceita varios NULL no Postgres, entao eles convivem.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('produtos', 'codigoPdv', {
            type: Sequelize.STRING(40),
            allowNull: true,
            unique: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('produtos', 'codigoPdv');
    },
};
