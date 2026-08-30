import { QueryTypes } from 'sequelize';
import { sequelize } from '../../src/config/database';

// Cada teste comeca com o banco vazio. Sem isso a suite passa a depender da
// ordem de execucao: um teste que cria um pedido quebra o proximo que conta
// pedidos, e a falha aparece longe da causa.
beforeEach(async () => {
    const tabelas = await sequelize.query<{ tablename: string }>(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
        { type: QueryTypes.SELECT },
    );

    const nomes = tabelas.map((linha) => `"${linha.tablename}"`).join(', ');

    if (nomes) {
        // RESTART IDENTITY para os ids voltarem a 1 e os testes poderem afirmar
        // sobre id previsivel; CASCADE por causa das FKs entre as tabelas.
        await sequelize.query(`TRUNCATE ${nomes} RESTART IDENTITY CASCADE`);
    }
});

// Sem fechar a conexao o Jest nao encerra o processo e a CI fica pendurada.
afterAll(async () => {
    await sequelize.close();
});
