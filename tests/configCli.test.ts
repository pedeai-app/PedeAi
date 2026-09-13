// Config do sequelize-cli (config/config.js): o CLI descarta os parametros da URL,
// entao o SSL que o Neon exige precisa sair daqui. Sem isso as migrations do
// deploy falham com "connection is insecure".
describe('config do sequelize-cli', () => {
    const urlOriginal = process.env.DATABASE_URL;

    afterEach(() => {
        process.env.DATABASE_URL = urlOriginal;
    });

    function carregarCom(url: string) {
        process.env.DATABASE_URL = url;
        let config: any;
        jest.isolateModules(() => {
            config = require('../config/config.js');
        });
        return config.production;
    }

    it('liga o SSL quando a URL pede sslmode=require (Neon)', () => {
        const config = carregarCom(
            'postgresql://u:p@ep-x.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
        );
        expect(config.dialectOptions).toEqual({ ssl: { require: true, rejectUnauthorized: true } });
    });

    it('nao liga SSL no Postgres local do compose', () => {
        const config = carregarCom('postgres://pedeai:pedeai@postgres:5432/pedeai');
        expect(config.dialectOptions).toBeUndefined();
    });

    it('nao confunde sslmode=disable com pedido de SSL', () => {
        const config = carregarCom('postgres://u:p@localhost:5432/db?sslmode=disable');
        expect(config.dialectOptions).toBeUndefined();
    });
});
