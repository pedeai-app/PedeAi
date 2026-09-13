// JPEG minimo, so com o cabecalho que o servidor le (SOI, APP0 e SOF0). Nao abre
// num visualizador, e nao precisa: o servidor confere formato e dimensoes pelo
// cabecalho, sem decodificar a imagem.
export function jpegFalso(largura: number, altura: number, bytesExtras = 0): Buffer {
    const soi = Buffer.from([0xff, 0xd8]);
    const app0 = Buffer.from([
        0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    ]);
    const sof0 = Buffer.alloc(19);
    sof0.writeUInt16BE(0xffc0, 0);
    sof0.writeUInt16BE(17, 2);
    sof0[4] = 8;
    sof0.writeUInt16BE(altura, 5);
    sof0.writeUInt16BE(largura, 7);
    sof0[9] = 3;
    const eoi = Buffer.from([0xff, 0xd9]);
    return Buffer.concat([soi, app0, sof0, Buffer.alloc(bytesExtras), eoi]);
}
