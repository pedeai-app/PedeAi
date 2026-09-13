import { chave } from './normalizacao';

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

export interface LinhaPdv {
    numeroLinha: number;
    codigo: string;
    nome: string;
    categoria: string;
    valorVenda: string;
    estoque: string;
}

export interface LinhaRejeitada {
    numeroLinha: number;
    motivo: string;
}

export interface LeituraCsv {
    linhas: LinhaPdv[];
    rejeitadas: LinhaRejeitada[];
}

// Colunas procuradas pelo nome, nao pela posicao: a ordem de exportacao do PDV
// pode mudar, e ler "Valor de Custo" no lugar de "Valor de Venda" seria vender
// sem margem sem nenhum erro aparecer.
const COLUNAS = {
    codigo: 'CODIGO',
    nome: 'NOME',
    categoria: 'CATEGORIA',
    valorVenda: 'VALOR DE VENDA',
    estoque: 'ESTOQUE',
} as const;

export function lerCsvPdv(conteudo: Buffer): LeituraCsv {
    const texto = conteudo.toString('latin1').replace(/^﻿/, '');
    const todas = texto.split(/\r?\n/);

    const cabecalho = (todas[0] ?? '').split(';').map(chave);
    const indice = {} as Record<keyof typeof COLUNAS, number>;

    for (const [campo, nomeColuna] of Object.entries(COLUNAS) as [keyof typeof COLUNAS, string][]) {
        const posicao = cabecalho.indexOf(nomeColuna);
        if (posicao === -1) {
            throw new Error(`Coluna "${nomeColuna}" nao encontrada no cabecalho do CSV.`);
        }
        indice[campo] = posicao;
    }

    const linhas: LinhaPdv[] = [];
    const rejeitadas: LinhaRejeitada[] = [];

    todas.slice(1).forEach((bruta, i) => {
        const numeroLinha = i + 2; // +1 do cabecalho, +1 porque editor conta de 1
        if (bruta.trim() === '') {
            return;
        }

        const campos = bruta.split(';');
        if (campos.length !== cabecalho.length) {
            rejeitadas.push({
                numeroLinha,
                motivo: `esperava ${cabecalho.length} colunas e veio ${campos.length}`,
            });
            return;
        }

        linhas.push({
            numeroLinha,
            codigo: campos[indice.codigo].trim(),
            nome: campos[indice.nome].trim(),
            categoria: campos[indice.categoria].trim(),
            valorVenda: campos[indice.valorVenda].trim(),
            estoque: campos[indice.estoque].trim(),
        });
    });

    return { linhas, rejeitadas };
}
