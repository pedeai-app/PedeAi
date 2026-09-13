/**
 * Largura e altura de um JPEG, lidas do cabecalho — sem decodificar a imagem e
 * sem dependencia nativa. null se o arquivo nao for JPEG valido.
 *
 * O servidor confere a foto mesmo vindo do admin: o front ja manda quadrado e
 * reduzido, mas um arquivo trocado ou uma chamada direta a API nao pode gravar
 * uma imagem de 8000px no catalogo.
 */
export function dimensoesJpeg(arquivo: Buffer): { largura: number; altura: number } | null {
    // Todo JPEG comeca com o marcador SOI (FF D8) seguido de outro marcador.
    if (arquivo.length < 4 || arquivo[0] !== 0xff || arquivo[1] !== 0xd8 || arquivo[2] !== 0xff) {
        return null;
    }

    let i = 2;
    while (i + 9 < arquivo.length) {
        if (arquivo[i] !== 0xff) return null;
        const marcador = arquivo[i + 1];

        // Bytes FF de preenchimento entre marcadores.
        if (marcador === 0xff) {
            i += 1;
            continue;
        }

        // SOF0..SOF15 trazem as dimensoes. C4 (tabela Huffman), C8 (reservado) e
        // CC (codificacao aritmetica) estao na mesma faixa e nao sao SOF.
        const ehSof = marcador >= 0xc0 && marcador <= 0xcf && marcador !== 0xc4 && marcador !== 0xc8 && marcador !== 0xcc;
        if (ehSof) {
            return { altura: arquivo.readUInt16BE(i + 5), largura: arquivo.readUInt16BE(i + 7) };
        }

        // Inicio dos dados comprimidos antes de achar as dimensoes: arquivo invalido.
        if (marcador === 0xda) return null;

        i += 2 + arquivo.readUInt16BE(i + 2);
    }
    return null;
}
