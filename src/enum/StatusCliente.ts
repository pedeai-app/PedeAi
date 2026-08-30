export enum StatusCliente {
    ATIVO = 'ATIVO',
    INATIVO = 'INATIVO',
    // Ainda nao usado: a exclusao de hoje so desativa. O valor nasce aqui porque
    // adicionar rotulo a um ENUM do Postgres depois exige ALTER TYPE, que nao roda
    // dentro da transacao de uma migration.
    ANONIMIZADO = 'ANONIMIZADO'
}
