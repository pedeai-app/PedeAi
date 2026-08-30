/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/tests/setupEnv.ts'],
    testMatch: ['<rootDir>/tests/**/*.test.ts'],
    // A suite de integracao tem config propria (jest.integration.config.js) e
    // exige Postgres; esta aqui roda em qualquer lugar, sem banco.
    testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/integration/'],
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
    },
};
