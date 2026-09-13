import "reflect-metadata";
import "dotenv/config";

import { readFileSync } from "fs";
import { sequelize } from "../config/database";
import { lerCsvPdv } from "../importacao/csvPdv";
import importacaoProdutoService, { OcorrenciaLinha } from "../services/importacaoProdutoService";

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

function listar(titulo: string, itens: OcorrenciaLinha[]) {
    if (itens.length === 0) {
        return;
    }
    console.log(`\n${titulo} (${itens.length})`);
    for (const item of itens) {
        const quem = item.codigo ? `[${item.codigo}] ${item.nome}` : "";
        console.log(`  linha ${item.linha}: ${quem}${quem ? " — " : ""}${item.motivo}`);
    }
}

async function main() {
    const argumentos = process.argv.slice(2);
    const arquivo = argumentos.find((a) => !a.startsWith("--"));
    const aplicar = argumentos.includes("--aplicar");

    if (!arquivo) {
        console.error("Uso: importar-produtos <arquivo.csv> [--aplicar]");
        process.exit(2);
    }

    const leitura = lerCsvPdv(readFileSync(arquivo));
    const r = await importacaoProdutoService.importar(leitura, { simular: !aplicar });

    console.log(r.simulacao
        ? "\n=== SIMULACAO — nada foi gravado. Rode com --aplicar para gravar. ==="
        : "\n=== IMPORTACAO APLICADA ===");

    console.log(`
Linhas lidas           ${r.lidas}
Produtos criados       ${r.criados}   (inativos por regra de categoria: ${r.criadosInativos})
Produtos atualizados   ${r.atualizados}   (so preco e estoque)
Sem alteracao          ${r.inalterados}
Esgotados              ${r.esgotados}
Descartadas            ${r.descartadas.length}
Categorias criadas     ${r.categoriasCriadas.length ? r.categoriasCriadas.join(", ") : "nenhuma"}`);

    listar("Descartadas", r.descartadas);
    listar("Ajustadas", r.ajustadas);
}

main()
    .catch((erro) => {
        console.error("\nFalhou, e nada foi gravado:", erro instanceof Error ? erro.message : erro);
        process.exitCode = 1;
    })
    .finally(() => sequelize.close());
