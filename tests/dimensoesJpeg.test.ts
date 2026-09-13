import { dimensoesJpeg } from '../src/utils/dimensoesJpeg';
import { jpegFalso } from './helpers/jpegFalso';

describe('dimensoesJpeg', () => {
    it('le largura e altura do cabecalho', () => {
        expect(dimensoesJpeg(jpegFalso(800, 600))).toEqual({ largura: 800, altura: 600 });
    });

    it('pula bytes FF de preenchimento entre marcadores', () => {
        const jpeg = jpegFalso(160, 160);
        const comPreenchimento = Buffer.concat([jpeg.subarray(0, 20), Buffer.from([0xff, 0xff]), jpeg.subarray(20)]);
        expect(dimensoesJpeg(comPreenchimento)).toEqual({ largura: 160, altura: 160 });
    });

    it('recusa PNG', () => {
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
        expect(dimensoesJpeg(png)).toBeNull();
    });

    it('recusa arquivo cortado antes das dimensoes', () => {
        expect(dimensoesJpeg(jpegFalso(800, 800).subarray(0, 12))).toBeNull();
    });

    // C4 e a tabela Huffman: esta na faixa dos SOF, mas nao traz dimensao nenhuma.
    it('nao confunde a tabela Huffman com as dimensoes', () => {
        const huffman = Buffer.from([0xff, 0xc4, 0x00, 0x06, 0x00, 0x01, 0x02, 0x03]);
        const jpeg = jpegFalso(400, 400);
        const comHuffman = Buffer.concat([jpeg.subarray(0, 20), huffman, jpeg.subarray(20)]);
        expect(dimensoesJpeg(comHuffman)).toEqual({ largura: 400, altura: 400 });
    });
});
