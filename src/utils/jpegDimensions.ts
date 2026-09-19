/**
 * Largura e altura de um JPEG, lidas do cabecalho — sem decodificar a imagem e
 * sem dependencia nativa. null se o arquivo nao for JPEG valido.
 *
 * O servidor confere a foto mesmo vindo do admin: o front ja manda quadrado e
 * reduzido, mas um arquivo trocado ou uma chamada direta a API nao pode gravar
 * uma imagem de 8000px no catalogo.
 */
export function jpegDimensions(file: Buffer): { width: number; height: number } | null {
    // Todo JPEG comeca com o marcador SOI (FF D8) seguido de outro marcador.
    if (file.length < 4 || file[0] !== 0xff || file[1] !== 0xd8 || file[2] !== 0xff) {
        return null;
    }

    let i = 2;
    while (i + 9 < file.length) {
        if (file[i] !== 0xff) return null;
        const marker = file[i + 1];

        // Bytes FF de preenchimento entre marcadores.
        if (marker === 0xff) {
            i += 1;
            continue;
        }

        // SOF0..SOF15 trazem as dimensoes. C4 (tabela Huffman), C8 (reservado) e
        // CC (codificacao aritmetica) estao na mesma faixa e nao sao SOF.
        const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isSof) {
            return { height: file.readUInt16BE(i + 5), width: file.readUInt16BE(i + 7) };
        }

        // Inicio dos dados comprimidos antes de achar as dimensoes: arquivo invalido.
        if (marker === 0xda) return null;

        i += 2 + file.readUInt16BE(i + 2);
    }
    return null;
}
