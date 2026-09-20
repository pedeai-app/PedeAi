import { key } from './normalization';

/**
 * Leitura da exportacao de produtos do PDV.
 *
 * O arquivo vem em ISO-8859-1, separado por ponto e virgula, com decimal em
 * virgula. Lido como UTF-8 — o padrao de quase tudo — os acentos quebram e
 * "AGUA COM GAS" vira lixo em silencio. A codificacao e fixada aqui por isso.
 *
 * Nao ha biblioteca de CSV: o formato nao usa aspas, e o arquivo real tem
 * exatamente o mesmo numero de separadores em todas as linhas. Uma linha com
 * colunas a mais ou a menos e rejeitada com o motivo, em vez de ser partida no
 * lugar errado — e o que aconteceria se um nome algum dia trouxer um ";".
 */

export interface PdvLine {
    lineNumber: number;
    code: string;
    name: string;
    category: string;
    salePrice: string;
    stock: string;
}

export interface RejectedLine {
    lineNumber: number;
    reason: string;
}

export interface CsvReading {
    lines: PdvLine[];
    rejected: RejectedLine[];
}

// Colunas procuradas pelo nome, nao pela posicao: a ordem de exportacao do PDV
// pode mudar, e ler "Valor de Custo" no lugar de "Valor de Venda" seria vender
// sem margem sem nenhum erro aparecer.
const COLUMNS = {
    code: 'CODIGO',
    name: 'NOME',
    category: 'CATEGORIA',
    salePrice: 'VALOR DE VENDA',
    stock: 'ESTOQUE',
} as const;

export function readPdvCsv(content: Buffer): CsvReading {
    const text = content.toString('latin1').replace(/^﻿/, '');
    const allLines = text.split(/\r?\n/);

    const header = (allLines[0] ?? '').split(';').map(key);
    const index = {} as Record<keyof typeof COLUMNS, number>;

    for (const [field, columnName] of Object.entries(COLUMNS) as [keyof typeof COLUMNS, string][]) {
        const position = header.indexOf(columnName);
        if (position === -1) {
            throw new Error(`Coluna "${columnName}" nao encontrada no cabecalho do CSV.`);
        }
        index[field] = position;
    }

    const lines: PdvLine[] = [];
    const rejected: RejectedLine[] = [];

    allLines.slice(1).forEach((rawLine, i) => {
        const lineNumber = i + 2; // +1 do cabecalho, +1 porque editor conta de 1
        if (rawLine.trim() === '') {
            return;
        }

        const fields = rawLine.split(';');
        if (fields.length !== header.length) {
            rejected.push({
                lineNumber,
                reason: `esperava ${header.length} colunas e veio ${fields.length}`,
            });
            return;
        }

        lines.push({
            lineNumber,
            code: fields[index.code].trim(),
            name: fields[index.name].trim(),
            category: fields[index.category].trim(),
            salePrice: fields[index.salePrice].trim(),
            stock: fields[index.stock].trim(),
        });
    });

    return { lines, rejected };
}
