import { Transaction } from "sequelize";
import { sequelize } from "../config/database";
import { Produto } from "../models/Produto";
import { Categoria } from "../models/Categoria";
import { LeituraCsv, LinhaPdv } from "../importacao/csvPdv";
import { CATEGORIAS_IGNORADAS, DestinoCategoria, MAPA_CATEGORIAS } from "../importacao/categorias";
import { chave, nomeLegivel, numeroBr, pareceCodigoDeBarras } from "../importacao/normalizacao";

export interface OcorrenciaLinha {
    linha: number;
    codigo: string;
    nome: string;
    motivo: string;
}

export interface RelatorioImportacao {
    simulacao: boolean;
    lidas: number;
    criados: number;
    atualizados: number;
    inalterados: number;
    /** Criados inativos por regra de categoria (doses, por exemplo). */
    criadosInativos: number;
    /** Com estoque zero depois dos ajustes: aparecem como esgotados. */
    esgotados: number;
    categoriasCriadas: string[];
    descartadas: OcorrenciaLinha[];
    ajustadas: OcorrenciaLinha[];
}

interface ProdutoNormalizado {
    linha: LinhaPdv;
    codigoPdv: string;
    nome: string;
    preco: number;
    estoque: number;
    destino: DestinoCategoria;
}

class ImportacaoProdutoService {

    /**
     * Importa a exportacao do PDV.
     *
     * Cria o que nao existe e, no que ja existe, atualiza SO preco e estoque. O
     * PDV e dono desses dois: e la que o lojista os mantem. Nome, descricao,
     * imagem, categoria e se o produto esta ativo passam a ser do admin depois da
     * primeira importacao — senao a proxima exportacao desfaria em silencio o nome
     * corrigido a mao, a foto cadastrada e o produto que alguem escondeu de
     * proposito.
     *
     * Com `simular`, faz tudo dentro da transacao e desfaz no fim. Os numeros do
     * relatorio sao os de verdade, com as constraints do banco valendo — nao uma
     * estimativa feita por fora.
     */
    async importar(leitura: LeituraCsv, { simular }: { simular: boolean }): Promise<RelatorioImportacao> {
        const relatorio: RelatorioImportacao = {
            simulacao: simular,
            lidas: leitura.linhas.length + leitura.rejeitadas.length,
            criados: 0,
            atualizados: 0,
            inalterados: 0,
            criadosInativos: 0,
            esgotados: 0,
            categoriasCriadas: [],
            descartadas: leitura.rejeitadas.map((r) => ({
                linha: r.numeroLinha, codigo: '', nome: '', motivo: r.motivo,
            })),
            ajustadas: [],
        };

        const produtos = this.normalizar(leitura.linhas, relatorio);

        const transaction = await sequelize.transaction();
        try {
            const categoriaIds = await this.resolverCategorias(produtos, relatorio, transaction);
            await this.gravarProdutos(produtos, categoriaIds, relatorio, transaction);

            if (simular) {
                await transaction.rollback();
            } else {
                await transaction.commit();
            }
        } catch (error) {
            await transaction.rollback();
            throw error;
        }

        relatorio.esgotados = produtos.filter((p) => p.estoque === 0).length;
        return relatorio;
    }

    private normalizar(linhas: LinhaPdv[], relatorio: RelatorioImportacao): ProdutoNormalizado[] {
        const vistos = new Set<string>();
        const produtos: ProdutoNormalizado[] = [];

        const descartar = (linha: LinhaPdv, motivo: string) => {
            relatorio.descartadas.push({ linha: linha.numeroLinha, codigo: linha.codigo, nome: linha.nome, motivo });
        };

        for (const linha of linhas) {
            const chaveCategoria = chave(linha.categoria);

            if (CATEGORIAS_IGNORADAS.has(chaveCategoria)) {
                descartar(linha, `categoria "${linha.categoria}" nao e produto`);
                continue;
            }
            if (!linha.codigo) {
                descartar(linha, 'sem codigo no PDV — sem ele, a proxima importacao duplicaria');
                continue;
            }
            if (vistos.has(linha.codigo)) {
                descartar(linha, 'codigo repetido no arquivo');
                continue;
            }
            if (pareceCodigoDeBarras(linha.nome)) {
                descartar(linha, 'o nome e um codigo de barras — corrija o cadastro no PDV');
                continue;
            }

            const destino = MAPA_CATEGORIAS[chaveCategoria];
            if (!destino) {
                descartar(linha, `categoria "${linha.categoria}" sem mapeamento em src/importacao/categorias.ts`);
                continue;
            }

            const preco = numeroBr(linha.valorVenda);
            if (preco === null || preco <= 0) {
                descartar(linha, `valor de venda invalido: "${linha.valorVenda}"`);
                continue;
            }

            const estoqueBruto = numeroBr(linha.estoque);
            if (estoqueBruto === null) {
                descartar(linha, `estoque invalido: "${linha.estoque}"`);
                continue;
            }

            let estoque = estoqueBruto;
            const ajustar = (motivo: string) =>
                relatorio.ajustadas.push({ linha: linha.numeroLinha, codigo: linha.codigo, nome: linha.nome, motivo });

            // Estoque negativo e defeito do PDV (venda registrada sem entrada), nao
            // informacao: o produto so nao tem unidades.
            if (estoque < 0) {
                ajustar(`estoque negativo (${linha.estoque}) virou 0`);
                estoque = 0;
            }
            // A coluna e inteira. Arredondar para BAIXO: prometer meia unidade que
            // nao existe e pior do que esconder uma que existe.
            if (!Number.isInteger(estoque)) {
                ajustar(`estoque fracionado (${linha.estoque}) arredondado para ${Math.floor(estoque)}`);
                estoque = Math.floor(estoque);
            }

            vistos.add(linha.codigo);
            produtos.push({
                linha,
                codigoPdv: linha.codigo,
                nome: nomeLegivel(linha.nome),
                preco,
                estoque,
                destino,
            });
        }

        return produtos;
    }

    private async resolverCategorias(
        produtos: ProdutoNormalizado[],
        relatorio: RelatorioImportacao,
        transaction: Transaction,
    ): Promise<Map<string, number>> {
        const ids = new Map<string, number>();
        const destinos = new Map(produtos.map((p) => [p.destino.categoria, p.destino]));

        for (const destino of destinos.values()) {
            // Categoria ja existente e reaproveitada como esta, inclusive o `ativo`:
            // se alguem a escondeu no admin, a importacao nao a devolve.
            const [categoria, criada] = await Categoria.findOrCreate({
                where: { nome: destino.categoria },
                defaults: { nome: destino.categoria, ativo: !destino.produtoInativo },
                transaction,
            });
            if (criada) {
                relatorio.categoriasCriadas.push(destino.categoria);
            }
            ids.set(destino.categoria, categoria.id);
        }

        return ids;
    }

    private async gravarProdutos(
        produtos: ProdutoNormalizado[],
        categoriaIds: Map<string, number>,
        relatorio: RelatorioImportacao,
        transaction: Transaction,
    ): Promise<void> {
        const existentes = await Produto.findAll({
            where: { codigoPdv: produtos.map((p) => p.codigoPdv) },
            transaction,
        });
        const porCodigo = new Map(existentes.map((p) => [p.codigoPdv as string, p]));

        const novos: Array<Partial<Produto>> = [];

        for (const produto of produtos) {
            const atual = porCodigo.get(produto.codigoPdv);

            if (!atual) {
                const ativo = !produto.destino.produtoInativo;
                novos.push({
                    codigoPdv: produto.codigoPdv,
                    nome: produto.nome,
                    preco: produto.preco,
                    estoque: produto.estoque,
                    ativo,
                    categoriaId: categoriaIds.get(produto.destino.categoria),
                });
                if (!ativo) {
                    relatorio.criadosInativos += 1;
                }
                continue;
            }

            // DECIMAL volta do pg como string: comparar como numero, senao "6.20"
            // nunca e igual a 6.2 e todo produto conta como atualizado.
            const mudou = Number(atual.preco) !== produto.preco || atual.estoque !== produto.estoque;
            if (!mudou) {
                relatorio.inalterados += 1;
                continue;
            }

            await atual.update(
                { preco: produto.preco, estoque: produto.estoque },
                { fields: ['preco', 'estoque'], transaction },
            );
            relatorio.atualizados += 1;
        }

        if (novos.length > 0) {
            await Produto.bulkCreate(novos, { transaction });
            relatorio.criados = novos.length;
        }
    }
}

export default new ImportacaoProdutoService();
