'use strict';

/**
 * Segunda imagem do produto, pequena (160x160), para as listas.
 *
 * A foto tirada no admin sobe em dois tamanhos: 800x800 para a pagina do produto
 * e 160x160 para o catalogo e o carrinho, onde ela aparece com 56px. Sem a
 * miniatura, cada pagina do catalogo baixaria doze fotos de 800px no celular.
 *
 * Nulavel: produto sem foto, ou com URL externa digitada a mao (que nao tem
 * miniatura), usa so o imagemUrl.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('produtos', 'imagemMiniaturaUrl', {
            type: Sequelize.STRING,
            allowNull: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('produtos', 'imagemMiniaturaUrl');
    },
};
