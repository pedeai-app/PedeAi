import "reflect-metadata";
import "dotenv/config";

import { readFileSync } from "fs";
import { sequelize } from "../config/database";
import { readPdvCsv } from "../import/pdvCsv";
import productImportService, { LineIssue } from "../services/productImportService";

/**
 * Importa a exportacao de produtos do PDV.
 *
 *   importar-produtos <arquivo.csv>             simula e mostra o que faria
 *   importar-produtos <arquivo.csv> --aplicar   grava
 *
 * Simular e o padrao, e gravar exige pedir. Uma importacao mexe em centenas de
 * produtos de uma vez, no banco que o cliente esta vendo; o erro caro e rodar sem
 * querer, nao esquecer o parametro.
 */

function listar(title: string, items: LineIssue[]) {
    if (items.length === 0) {
        return;
    }
    console.log(`\n${title} (${items.length})`);
    for (const item of items) {
        const who = item.code ? `[${item.code}] ${item.name}` : "";
        console.log(`  linha ${item.line}: ${who}${who ? " — " : ""}${item.reason}`);
    }
}

async function main() {
    const argumentos = process.argv.slice(2);
    const file = argumentos.find((a) => !a.startsWith("--"));
    const aplicar = argumentos.includes("--aplicar");

    if (!file) {
        console.error("Uso: importar-produtos <arquivo.csv> [--aplicar]");
        process.exit(2);
    }

    const reading = readPdvCsv(readFileSync(file));
    const r = await productImportService.importProducts(reading, { dryRun: !aplicar });

    console.log(r.dryRun
        ? "\n=== SIMULACAO — nada foi gravado. Rode com --aplicar para gravar. ==="
        : "\n=== IMPORTACAO APLICADA ===");

    console.log(`
Linhas lidas           ${r.linesRead}
Produtos criados       ${r.created}   (inativos por regra de categoria: ${r.createdInactive})
Produtos atualizados   ${r.updated}   (so preco e estoque)
Sem alteracao          ${r.unchanged}
Esgotados              ${r.outOfStock}
Descartadas            ${r.discarded.length}
Categorias criadas     ${r.createdCategories.length ? r.createdCategories.join(", ") : "nenhuma"}`);

    listar("Descartadas", r.discarded);
    listar("Ajustadas", r.adjusted);
}

main()
    .catch((error) => {
        console.error("\nFalhou, e nada foi gravado:", error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => sequelize.close());
