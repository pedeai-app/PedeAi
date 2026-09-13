require('dotenv').config();

// Configuração consumida pelo sequelize-cli (migrations/seeders).
// Todos os ambientes usam a mesma DATABASE_URL definida no .env.

// O sequelize-cli quebra a URL em host, usuário e senha e DESCARTA os parâmetros —
// inclusive o sslmode. A API não sofre disso (o Sequelize dela lê o sslmode da
// URL), mas as migrations conectavam sem SSL e o Neon recusava: "connection is
// insecure". Então o SSL é pedido aqui, só quando a própria URL pede — o Postgres
// local do compose segue sem SSL, como sempre.
function opcoesDeSsl(url) {
    if (!/[?&]sslmode=(require|verify-ca|verify-full)(&|$)/.test(url || '')) return {};
    return { dialectOptions: { ssl: { require: true, rejectUnauthorized: true } } };
}

const base = {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    ...opcoesDeSsl(process.env.DATABASE_URL),
};

module.exports = {
    development: base,
    test: base,
    production: base,
};
