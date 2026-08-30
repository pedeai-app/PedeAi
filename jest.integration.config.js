/**
 * Suite de integracao: sobe o app contra um Postgres de verdade.
 *
 * Separada da suite padrao (`npm test`) de proposito — aquela e rapida e nao
 * exige banco nenhum, e continua servindo como checagem de bolso. Esta exige
 * Postgres e e a unica que executa services, models e migrations.
 *
 * @type {import('jest').Config}
 */
module.exports = {
    testEnvironment: 'node',
    globalSetup: '<rootDir>/tests/integration/globalSetup.ts',
    setupFiles: ['<rootDir>/tests/integration/setupEnv.ts'],
    setupFilesAfterEnv: ['<rootDir>/tests/integration/setupApos.ts'],
    testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
    // Um banco compartilhado nao suporta arquivos em paralelo: o TRUNCATE de um
    // apagaria os dados que o outro acabou de criar.
    maxWorkers: 1,
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
    },
};
