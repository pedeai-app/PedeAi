'use strict';

// Os valores dos ENUM passam a ingles junto com o resto da API.
//
// No Postgres isto e troca de rotulo em pg_enum, nao alteracao de dado: cada
// linha guarda o OID do valor, entao pedido e cliente ja gravados acompanham
// sozinhos, e o DEFAULT da coluna tambem. Por isso nao ha UPDATE aqui.
//
// ATENCAO NO RESTORE: um dump anterior a esta migration volta com os valores
// antigos ('PENDENTE'). Depois de restaurar um backup velho, rode as migrations
// (`npm run db:migrate`) antes de subir a API — senao a API nao entende o status.

const RENOMES = {
    enum_clientes_role: {
        CLIENTE: 'CUSTOMER',
    },
    enum_clientes_status: {
        ATIVO: 'ACTIVE',
        INATIVO: 'INACTIVE',
        ANONIMIZADO: 'ANONYMIZED',
    },
    enum_pedidos_status: {
        PENDENTE: 'PENDING',
        CONFIRMADO: 'CONFIRMED',
        EM_PREPARO: 'PREPARING',
        SAIU_PARA_ENTREGA: 'OUT_FOR_DELIVERY',
        ENTREGUE: 'DELIVERED',
        CANCELADO: 'CANCELLED',
    },
};

async function aplicar(queryInterface, inverter) {
    for (const [tipo, mapa] of Object.entries(RENOMES)) {
        for (const [antigo, novo] of Object.entries(mapa)) {
            const [de, para] = inverter ? [novo, antigo] : [antigo, novo];
            await queryInterface.sequelize.query(
                `ALTER TYPE "${tipo}" RENAME VALUE '${de}' TO '${para}';`,
            );
        }
    }
}

module.exports = {
    async up(queryInterface) {
        await aplicar(queryInterface, false);
    },

    async down(queryInterface) {
        await aplicar(queryInterface, true);
    },
};
