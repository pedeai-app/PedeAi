/**
 * De categoria do PDV para categoria do app.
 *
 * O PDV tem 65 categorias e muitas nao sao categorias: sao marcas (ICE, COROTE,
 * DIPLOKO), grafias diferentes da mesma coisa (AGUA, AGUA, AGUA CRYSTAL; VODKA e
 * VOLDKA) ou gavetas de um item so. Para o cliente, isso vira dezenas de chips e
 * "Agua" aparecendo duas vezes. O app agrupa por tipo de produto.
 *
 * Esta tabela e o lugar de ajustar. Categoria do PDV que nao estiver aqui NAO e
 * importada com um palpite: o produto sai no relatorio como "categoria sem
 * mapeamento", para alguem decidir. Um palpite errado iria parar no cardapio sem
 * ninguem perceber.
 *
 * As chaves sao comparadas ja normalizadas (maiusculas, sem acento, espacos
 * colapsados), entao "AGUA" e "AGUA" caem na mesma linha.
 */

export interface DestinoCategoria {
    /** Nome exibido ao cliente. */
    categoria: string;
    /**
     * Produtos desta categoria entram inativos. Existe para o que faz sentido
     * cadastrado no sistema mas nao faz sentido vender pela internet.
     */
    produtoInativo?: boolean;
}

/** Categorias do PDV que nao sao produto. As linhas sao descartadas. */
export const CATEGORIAS_IGNORADAS = new Set<string>([
    // "20 DINHEIRO": saque em especie no caixa. Nao e mercadoria.
    'SAQUE',
]);

const CERVEJAS: DestinoCategoria = { categoria: 'Cervejas' };
const DESTILADOS: DestinoCategoria = { categoria: 'Destilados' };
const VINHOS: DestinoCategoria = { categoria: 'Vinhos e espumantes' };
const LICORES: DestinoCategoria = { categoria: 'Licores e batidas' };
const DRINKS: DestinoCategoria = { categoria: 'Drinks prontos' };
const COMBOS: DestinoCategoria = { categoria: 'Combos' };
// Dose e servida no balcao: nao se entrega uma dose de whisky em casa.
const DOSES: DestinoCategoria = { categoria: 'Doses', produtoInativo: true };

const REFRIGERANTES: DestinoCategoria = { categoria: 'Refrigerantes' };
const AGUAS: DestinoCategoria = { categoria: 'Águas' };
const SUCOS: DestinoCategoria = { categoria: 'Sucos' };
const ENERGETICOS: DestinoCategoria = { categoria: 'Energéticos e isotônicos' };
const CAFE: DestinoCategoria = { categoria: 'Café e chá' };

const SALGADINHOS: DestinoCategoria = { categoria: 'Salgadinhos' };
const DOCES: DestinoCategoria = { categoria: 'Doces' };
const SORVETES: DestinoCategoria = { categoria: 'Sorvetes' };
const BISCOITOS: DestinoCategoria = { categoria: 'Biscoitos' };
const MERCEARIA: DestinoCategoria = { categoria: 'Mercearia' };

const GELO: DestinoCategoria = { categoria: 'Gelo e carvão' };
const DESCARTAVEIS: DestinoCategoria = { categoria: 'Descartáveis' };
const HIGIENE: DestinoCategoria = { categoria: 'Higiene' };
const UTILIDADES: DestinoCategoria = { categoria: 'Utilidades' };

const CIGARROS: DestinoCategoria = { categoria: 'Cigarros' };
const TABACARIA: DestinoCategoria = { categoria: 'Tabacaria' };

export const MAPA_CATEGORIAS: Record<string, DestinoCategoria> = {
    'CERVEJA': CERVEJAS,
    'CAIXA DE CERVEJA': CERVEJAS,

    'WISKY': DESTILADOS,
    'VODKA': DESTILADOS,
    'VOLDKA': DESTILADOS,
    'GIN': DESTILADOS,
    'RUM': DESTILADOS,
    'CONHAQUE': DESTILADOS,
    'AGUARDENTE': DESTILADOS,

    'VINHO': VINHOS,
    'ESPUMANTE': VINHOS,
    'CHAMPANHE': VINHOS,
    'VERMUTH': VINHOS,

    'LICOR': LICORES,
    'BATIDAS': LICORES,
    'COQUITEL': LICORES,
    'COROTE': LICORES,
    'XEQUE MATE': LICORES,

    'DRINK PRONTO': DRINKS,
    'ICE': DRINKS,
    'DIPLOKO': DRINKS,

    'COMBO': COMBOS,
    'DOSE BEBIDAS': DOSES,

    'REFRIGERANTE': REFRIGERANTES,
    'TONICA': REFRIGERANTES,

    'AGUA': AGUAS,
    'AGUA CRYSTAL': AGUAS,

    'SUCO': SUCOS,

    'ENERGETICO': ENERGETICOS,
    'ISOTONICO': ENERGETICOS,

    'CAFE': CAFE,
    'CHA': CAFE,
    'CHOMILK': CAFE,

    'SALGADINHO': SALGADINHOS,

    'DOCES': DOCES,
    'CHOCOLATE': DOCES,
    'BALAS': DOCES,
    'CHICLETES': DOCES,
    'PASTILHA': DOCES,
    'BARRA DE CEREAL': DOCES,

    'SORVETE': SORVETES,
    'CREMOSINHO': SORVETES,

    'BISCOITO': BISCOITOS,

    'MERCEARIA': MERCEARIA,
    'PAO': MERCEARIA,
    'CATCHUP': MERCEARIA,
    'MORTADELA': MERCEARIA,

    'GELO': GELO,
    'CARVAO': GELO,

    'COPAO': DESCARTAVEIS,
    'COPO DESCARTAVEL': DESCARTAVEIS,
    'EMBALAGEM': DESCARTAVEIS,

    'SABAO': HIGIENE,
    'PRESTOBARBA': HIGIENE,

    'PANELA': UTILIDADES,
    'ESTALOS': UTILIDADES,

    'CIGARRO': CIGARROS,
    'TABACO': CIGARROS,

    'SEDA': TABACARIA,
    'ESSENCIA': TABACARIA,
    'ALUMINIO NARGUILE': TABACARIA,
    'PITEIRA DE PAPEL': TABACARIA,
    'ISQUEIRO': TABACARIA,
};
