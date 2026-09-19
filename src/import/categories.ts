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

export interface CategoryTarget {
    /** Nome exibido ao cliente. */
    category: string;
    /**
     * Produtos desta categoria entram inativos. Existe para o que faz sentido
     * cadastrado no sistema mas nao faz sentido vender pela internet.
     */
    inactiveProduct?: boolean;
}

/** Categorias do PDV que nao sao produto. As linhas sao descartadas. */
export const IGNORED_CATEGORIES = new Set<string>([
    // "20 DINHEIRO": saque em especie no caixa. Nao e mercadoria.
    'SAQUE',
]);

const CERVEJAS: CategoryTarget = { category: 'Cervejas' };
const DESTILADOS: CategoryTarget = { category: 'Destilados' };
const VINHOS: CategoryTarget = { category: 'Vinhos e espumantes' };
const LICORES: CategoryTarget = { category: 'Licores e batidas' };
const DRINKS: CategoryTarget = { category: 'Drinks prontos' };
const COMBOS: CategoryTarget = { category: 'Combos' };
// Dose e servida no balcao: nao se entrega uma dose de whisky em casa.
const DOSES: CategoryTarget = { category: 'Doses', inactiveProduct: true };

const REFRIGERANTES: CategoryTarget = { category: 'Refrigerantes' };
const AGUAS: CategoryTarget = { category: 'Águas' };
const SUCOS: CategoryTarget = { category: 'Sucos' };
const ENERGETICOS: CategoryTarget = { category: 'Energéticos e isotônicos' };
const CAFE: CategoryTarget = { category: 'Café e chá' };

const SALGADINHOS: CategoryTarget = { category: 'Salgadinhos' };
const DOCES: CategoryTarget = { category: 'Doces' };
const SORVETES: CategoryTarget = { category: 'Sorvetes' };
const BISCOITOS: CategoryTarget = { category: 'Biscoitos' };
const MERCEARIA: CategoryTarget = { category: 'Mercearia' };

const GELO: CategoryTarget = { category: 'Gelo e carvão' };
const DISCARDABLE: CategoryTarget = { category: 'Descartáveis' };
const HIGIENE: CategoryTarget = { category: 'Higiene' };
const UTILIDADES: CategoryTarget = { category: 'Utilidades' };

const CIGARROS: CategoryTarget = { category: 'Cigarros' };
const TABACARIA: CategoryTarget = { category: 'Tabacaria' };

export const CATEGORY_MAP: Record<string, CategoryTarget> = {
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

    'COPAO': DISCARDABLE,
    'COPO DESCARTAVEL': DISCARDABLE,
    'EMBALAGEM': DISCARDABLE,

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
