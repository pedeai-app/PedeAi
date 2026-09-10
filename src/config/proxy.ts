/**
 * Quantos proxies existem entre a internet e este processo.
 *
 * Importa porque o Express so descobre o IP real do visitante lendo o
 * `X-Forwarded-For`, e ele so confia nesse header se souber quantos saltos
 * confiaveis tem na frente. Sem isso, `req.ip` vira o IP de quem entregou a
 * requisicao — o container do proxy — e fica igual para todos os visitantes.
 *
 * O padrao e 0: em desenvolvimento o navegador fala direto com a API, e ai o IP
 * do socket ja e o certo. Confiar em proxy que nao existe seria pior que nao
 * confiar em nenhum — qualquer um poderia forjar o header e se passar por outro
 * endereco.
 *
 * Em producao atras do Cloudflare Tunnel sao 2: o `cloudflared` e o Caddy.
 */
const bruto = process.env.TRUST_PROXY ?? '0';
const analisado = Number.parseInt(bruto, 10);

export const SALTOS_DE_PROXY = Number.isFinite(analisado) && analisado > 0 ? analisado : 0;

/** Se ha proxy declarado, os headers que ele injeta podem ser levados a serio. */
export const ATRAS_DE_PROXY = SALTOS_DE_PROXY > 0;
