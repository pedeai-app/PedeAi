import fs from 'fs';
import path from 'path';
import { Sequelize } from 'sequelize';
import { nomeBancoTeste, urlBancoTeste, urlManutencao } from './helpers/config';

// Prepara o banco de teste uma vez por rodada: cria se nao existir, zera o
// schema e aplica TODAS as migrations do repo.
//
// As migrations sao executadas diretamente (require + up), sem sequelize-cli em
// subprocesso. Isso evita depender de spawn — que falha com EPERM em algumas
// maquinas Windows — e tem um efeito colateral desejado: cada rodada da suite
// passa a ser tambem um teste de que as migrations aplicam do zero.
export default async function globalSetup(): Promise<void> {
    const banco = nomeBancoTeste();

    const manutencao = new Sequelize(urlManutencao(), { logging: false });
    try {
        const [existentes] = await manutencao.query(
            `SELECT 1 FROM pg_database WHERE datname = '${banco}'`,
        );

        if (existentes.length === 0) {
            await manutencao.query(`CREATE DATABASE "${banco}"`);
        }
    } finally {
        await manutencao.close();
    }

    const db = new Sequelize(urlBancoTeste(), { logging: false });
    try {
        // Schema zerado a cada rodada: o estado da rodada anterior nunca vaza,
        // e migration nova entra sem ninguem precisar lembrar de rodar nada.
        await db.query('DROP SCHEMA IF EXISTS public CASCADE');
        await db.query('CREATE SCHEMA public');

        const queryInterface = db.getQueryInterface();
        const pasta = path.resolve(__dirname, '..', '..', 'migrations');
        const files = fs
            .readdirSync(pasta)
            .filter((file) => file.endsWith('.js'))
            .sort();

        if (files.length === 0) {
            throw new Error(`Nenhuma migration encontrada em ${pasta}.`);
        }

        for (const file of files) {
            const migration = require(path.join(pasta, file));
            await migration.up(queryInterface, Sequelize);
        }
    } finally {
        await db.close();
    }
}
