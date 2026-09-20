import { Transaction } from "sequelize";
import { sequelize } from "../config/database";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { CsvReading, PdvLine } from "../import/pdvCsv";
import { IGNORED_CATEGORIES, CategoryTarget, CATEGORY_MAP } from "../import/categories";
import { key, readableName, brNumber, looksLikeBarcode } from "../import/normalization";

export interface LineIssue {
    line: number;
    code: string;
    name: string;
    reason: string;
}

export interface ImportReport {
    dryRun: boolean;
    linesRead: number;
    created: number;
    updated: number;
    unchanged: number;
    /** Criados inativos por regra de categoria (doses, por exemplo). */
    createdInactive: number;
    /** Com estoque zero depois dos ajustes: aparecem como esgotados. */
    outOfStock: number;
    createdCategories: string[];
    discarded: LineIssue[];
    adjusted: LineIssue[];
}

interface NormalizedProduct {
    line: PdvLine;
    pdvCode: string;
    name: string;
    price: number;
    stock: number;
    target: CategoryTarget;
}

class ProductImportService {

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
    async importProducts(reading: CsvReading, { dryRun }: { dryRun: boolean }): Promise<ImportReport> {
        const report: ImportReport = {
            dryRun,
            linesRead: reading.lines.length + reading.rejected.length,
            created: 0,
            updated: 0,
            unchanged: 0,
            createdInactive: 0,
            outOfStock: 0,
            createdCategories: [],
            discarded: reading.rejected.map((r) => ({
                line: r.lineNumber, code: '', name: '', reason: r.reason,
            })),
            adjusted: [],
        };

        const products = this.normalize(reading.lines, report);

        const transaction = await sequelize.transaction();
        try {
            const categoryIds = await this.resolveCategories(products, report, transaction);
            await this.saveProducts(products, categoryIds, report, transaction);

            if (dryRun) {
                await transaction.rollback();
            } else {
                await transaction.commit();
            }
        } catch (error) {
            await transaction.rollback();
            throw error;
        }

        report.outOfStock = products.filter((p) => p.stock === 0).length;
        return report;
    }

    private normalize(lines: PdvLine[], report: ImportReport): NormalizedProduct[] {
        const vistos = new Set<string>();
        const products: NormalizedProduct[] = [];

        const discard = (line: PdvLine, reason: string) => {
            report.discarded.push({ line: line.lineNumber, code: line.code, name: line.name, reason });
        };

        for (const line of lines) {
            const categoryKey = key(line.category);

            if (IGNORED_CATEGORIES.has(categoryKey)) {
                discard(line, `categoria "${line.category}" nao e produto`);
                continue;
            }
            if (!line.code) {
                discard(line, 'sem codigo no PDV — sem ele, a proxima importacao duplicaria');
                continue;
            }
            if (vistos.has(line.code)) {
                discard(line, 'codigo repetido no arquivo');
                continue;
            }
            if (looksLikeBarcode(line.name)) {
                discard(line, 'o nome e um codigo de barras — corrija o cadastro no PDV');
                continue;
            }

            const target = CATEGORY_MAP[categoryKey];
            if (!target) {
                discard(line, `categoria "${line.category}" sem mapeamento em src/importacao/categorias.ts`);
                continue;
            }

            const price = brNumber(line.salePrice);
            if (price === null || price <= 0) {
                discard(line, `valor de venda invalido: "${line.salePrice}"`);
                continue;
            }

            const rawStock = brNumber(line.stock);
            if (rawStock === null) {
                discard(line, `estoque invalido: "${line.stock}"`);
                continue;
            }

            let stock = rawStock;
            const ajustar = (reason: string) =>
                report.adjusted.push({ line: line.lineNumber, code: line.code, name: line.name, reason });

            // Estoque negativo e defeito do PDV (venda registrada sem entrada), nao
            // informacao: o produto so nao tem unidades.
            if (stock < 0) {
                ajustar(`estoque negativo (${line.stock}) virou 0`);
                stock = 0;
            }
            // A coluna e inteira. Arredondar para BAIXO: prometer meia unidade que
            // nao existe e pior do que esconder uma que existe.
            if (!Number.isInteger(stock)) {
                ajustar(`estoque fracionado (${line.stock}) arredondado para ${Math.floor(stock)}`);
                stock = Math.floor(stock);
            }

            vistos.add(line.code);
            products.push({
                line,
                pdvCode: line.code,
                name: readableName(line.name),
                price,
                stock,
                target,
            });
        }

        return products;
    }

    private async resolveCategories(
        products: NormalizedProduct[],
        report: ImportReport,
        transaction: Transaction,
    ): Promise<Map<string, number>> {
        const ids = new Map<string, number>();
        const targets = new Map(products.map((p) => [p.target.category, p.target]));

        for (const target of targets.values()) {
            // Categoria ja existente e reaproveitada como esta, inclusive o `ativo`:
            // se alguem a escondeu no admin, a importacao nao a devolve.
            const [category, criada] = await Category.findOrCreate({
                where: { name: target.category },
                defaults: { name: target.category, active: !target.inactiveProduct },
                transaction,
            });
            if (criada) {
                report.createdCategories.push(target.category);
            }
            ids.set(target.category, category.id);
        }

        return ids;
    }

    private async saveProducts(
        products: NormalizedProduct[],
        categoryIds: Map<string, number>,
        report: ImportReport,
        transaction: Transaction,
    ): Promise<void> {
        const existentes = await Product.findAll({
            where: { pdvCode: products.map((p) => p.pdvCode) },
            transaction,
        });
        const byCode = new Map(existentes.map((p) => [p.pdvCode as string, p]));

        const novos: Array<Partial<Product>> = [];

        for (const product of products) {
            const current = byCode.get(product.pdvCode);

            if (!current) {
                const active = !product.target.inactiveProduct;
                novos.push({
                    pdvCode: product.pdvCode,
                    name: product.name,
                    price: product.price,
                    stock: product.stock,
                    active,
                    categoryId: categoryIds.get(product.target.category),
                });
                if (!active) {
                    report.createdInactive += 1;
                }
                continue;
            }

            // DECIMAL volta do pg como string: comparar como numero, senao "6.20"
            // nunca e igual a 6.2 e todo produto conta como atualizado.
            const mudou = Number(current.price) !== product.price || current.stock !== product.stock;
            if (!mudou) {
                report.unchanged += 1;
                continue;
            }

            await current.update(
                { price: product.price, stock: product.stock },
                { fields: ['price', 'stock'], transaction },
            );
            report.updated += 1;
        }

        if (novos.length > 0) {
            await Product.bulkCreate(novos, { transaction });
            report.created = novos.length;
        }
    }
}

export default new ProductImportService();
