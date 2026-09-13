/**
 * Transformacoes puras aplicadas a cada linha da exportacao do PDV.
 *
 * Ficam separadas do service para poderem ser testadas sem banco: e aqui que mora
 * a parte facil de errar em silencio — um "DANIEL'S" que vira "Daniel'S", um
 * "6,20" lido como 620.
 */

/** Maiusculas, sem acento, espacos colapsados. A forma de comparar chaves. */
export function chave(texto: string): string {
    return texto
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Numero no formato brasileiro: "1.234,56" -> 1234.56.
 * Devolve null para vazio ou ilegivel — quem chama decide se isso descarta a
 * linha, em vez de um NaN atravessar ate o banco.
 */
export function numeroBr(texto: string): number | null {
    const limpo = texto.trim();
    if (limpo === '') {
        return null;
    }
    if (!/^-?[\d.]+(,\d+)?$/.test(limpo)) {
        return null;
    }
    const valor = Number(limpo.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(valor) ? valor : null;
}

// Unidades abreviadas. A grafia do destino segue a convencao de embalagem: litro
// em maiuscula, o resto em minuscula. Palavras por extenso ("LITRO") ficam de fora
// de proposito: "1 Litro" continua "1 Litro", so capitalizado.
const UNIDADES: Record<string, string> = {
    ML: 'ml',
    L: 'L',
    LT: 'L',
    G: 'g',
    GR: 'g',
    KG: 'kg',
    UNI: 'un',
};

// Coladas ao numero, tambem as por extenso viram abreviacao: "2LITROS" nao tem
// espaco para ser lido como palavra.
const UNIDADES_COLADAS: Record<string, string> = { ...UNIDADES, LITRO: 'L', LITROS: 'L' };

const NUMERO = /^\d+(?:[.,]\d+)?$/;

// Palavras que ficam minusculas no meio do nome: "Agua de Coco", nao "Agua De Coco".
const MINUSCULAS = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'COM', 'SEM', 'E', 'EM', 'PARA']);

function capitalizarParte(parte: string): string {
    const minuscula = parte.toLocaleLowerCase('pt-BR');
    // Primeira LETRA, nao primeiro caractere: "(lata)" vira "(Lata)".
    return minuscula.replace(/\p{L}/u, (letra) => letra.toLocaleUpperCase('pt-BR'));
}

function formatarToken(token: string, indice: number, tokens: string[]): string {
    const maiusculo = token.toUpperCase();

    const colado = /^(\d+(?:[.,]\d+)?)(\p{L}+)$/u.exec(token);
    if (colado && UNIDADES_COLADAS[colado[2].toUpperCase()]) {
        return colado[1] + UNIDADES_COLADAS[colado[2].toUpperCase()];
    }

    // Solta, so e unidade logo depois de um numero: "600 ML". Sem essa exigencia,
    // um "L" ou um "G" qualquer no meio do nome viraria minusculo sem motivo.
    if (UNIDADES[maiusculo] && indice > 0 && NUMERO.test(tokens[indice - 1])) {
        return UNIDADES[maiusculo];
    }

    if (indice > 0 && MINUSCULAS.has(chave(token))) {
        return token.toLocaleLowerCase('pt-BR');
    }

    // Marcas com "&" sao siglas: "M&M'S" vira "M&M's", nao "M&m's".
    if (token.includes('&')) {
        const [antes, ...depois] = token.split("'");
        return antes.toUpperCase() + (depois.length ? "'" + depois.join("'").toLowerCase() : '');
    }

    // Hifen e ponto separam palavras que se capitalizam sozinhas: "Coca-Cola",
    // "Cart.Pap". O apostrofo nao: capitalizar depois dele e o que produz "Daniel'S".
    return token
        .split(/([-.])/)
        .map((parte) => (parte === '-' || parte === '.' ? parte : capitalizarParte(parte)))
        .join('');
}

/**
 * Nome legivel ao cliente a partir do nome do PDV, que vem todo em maiusculas.
 *
 * O PDV usa ora "'" ora "´" como apostrofo — "DANIEL'S" e "DANIEL´S" sao o mesmo
 * whisky em linhas diferentes. Normalizar isso antes e o que impede o mesmo
 * produto de aparecer com duas grafias.
 */
export function nomeLegivel(bruto: string): string {
    return bruto
        .replace(/[´’‘`]/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .map(formatarToken)
        .join(' ');
}

/** Um nome que e so digitos e um codigo de barras que foi parar no campo errado. */
export function pareceCodigoDeBarras(nome: string): boolean {
    return /^\d{8,14}$/.test(nome.trim());
}
