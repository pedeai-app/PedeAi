// Banco usado pelos testes de integracao. E um banco SEPARADO do de
// desenvolvimento de proposito: a suite apaga todas as tabelas entre os testes,
// e apontar para o banco de trabalho destruiria os dados de quem esta rodando.
const URL_PADRAO = 'postgresql://pedeai:pedeai@localhost:5432/pedeai_test';

export function urlBancoTeste(): string {
    return process.env.DATABASE_URL_TEST || URL_PADRAO;
}

export function nomeBancoTeste(): string {
    return new URL(urlBancoTeste()).pathname.replace(/^\//, '');
}

// Conexao com o banco `postgres` do mesmo servidor, usada so para criar o banco
// de teste: nao da para criar um banco estando conectado nele.
export function urlManutencao(): string {
    const url = new URL(urlBancoTeste());
    url.pathname = '/postgres';
    return url.toString();
}
