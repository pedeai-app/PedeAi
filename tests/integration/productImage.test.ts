import request from 'supertest';
import app from '../../src/app';
import { Product } from '../../src/models/Product';
import {
    ImageStorage,
    setImageStorage,
} from '../../src/services/imageStorage';
import { jpegFalso } from '../helpers/fakeJpeg';
import { createAdmin, createCustomer, createProduct, tokenFor } from './helpers/factories';

const BASE = 'https://imagens.teste/';

// No lugar do R2: guarda em memoria e registra o que foi apagado.
class MemoryStorage implements ImageStorage {
    objetos = new Map<string, { content: Buffer; tipo: string }>();
    apagados: string[] = [];
    falharEnvio = false;

    async upload(key: string, content: Buffer, tipo: string) {
        if (this.falharEnvio) throw new Error('R2 fora do ar');
        this.objetos.set(key, { content, tipo });
    }
    async apagar(key: string) {
        this.apagados.push(key);
        this.objetos.delete(key);
    }
    publicUrl(key: string) {
        return `${BASE}${key}`;
    }
    keyFromUrl(url: string) {
        return url.startsWith(BASE) ? url.slice(BASE.length) : null;
    }
}

describe('Foto do produto (com banco)', () => {
    let armazenamento: MemoryStorage;
    let token: string;

    beforeEach(async () => {
        armazenamento = new MemoryStorage();
        setImageStorage(armazenamento);
        token = tokenFor(await createAdmin());
    });

    afterAll(() => setImageStorage(undefined as unknown as null));

    function upload(productId: number, grande = jpegFalso(800, 800, 2000), miniatura = jpegFalso(160, 160, 300)) {
        return request(app)
            .put(`/products/${productId}/image`)
            .set('Authorization', `Bearer ${token}`)
            .attach('grande', grande, 'grande.jpg')
            .attach('miniatura', miniatura, 'miniatura.jpg');
    }

    it('grava os dois tamanhos e aponta o produto para eles', async () => {
        const product = await createProduct();
        const grande = jpegFalso(800, 800, 2000);

        const res = await upload(product.id, grande);

        expect(res.status).toBe(200);
        expect(res.body.imageUrl).toMatch(new RegExp(`^${BASE}produtos/${product.id}/[0-9a-f]{12}-800\\.jpg$`));
        expect(res.body.thumbnailUrl).toMatch(new RegExp(`^${BASE}produtos/${product.id}/[0-9a-f]{12}-160\\.jpg$`));

        const largeKey = armazenamento.keyFromUrl(res.body.imageUrl)!;
        expect(armazenamento.objetos.get(largeKey)).toEqual({ content: grande, tipo: 'image/jpeg' });
        expect(armazenamento.objetos.size).toBe(2);

        const noBanco = await Product.findByPk(product.id);
        expect(noBanco?.imageUrl).toBe(res.body.imageUrl);
    });

    // Trocar a foto nao pode deixar a antiga ocupando o bucket para sempre.
    it('trocar a foto apaga os arquivos da anterior', async () => {
        const product = await createProduct();
        const primeira = await upload(product.id);
        const segunda = await upload(product.id);

        expect(segunda.status).toBe(200);
        expect(segunda.body.imageUrl).not.toBe(primeira.body.imageUrl);
        expect(armazenamento.objetos.size).toBe(2);
        expect(armazenamento.apagados.sort()).toEqual(
            [armazenamento.keyFromUrl(primeira.body.imageUrl), armazenamento.keyFromUrl(primeira.body.thumbnailUrl)].sort(),
        );
    });

    it('URL externa digitada a mao nao e apagada de lugar nenhum', async () => {
        const product = await createProduct({ imageUrl: 'https://cdn.externo.com/cerveja.jpg' });

        const res = await upload(product.id);

        expect(res.status).toBe(200);
        expect(armazenamento.apagados).toEqual([]);
    });

    it.each([
        ['nao e JPEG', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]), jpegFalso(160, 160), /JPEG/],
        ['nao e quadrada', jpegFalso(800, 600), jpegFalso(160, 160), /quadrada/],
        ['e pequena demais', jpegFalso(300, 300), jpegFalso(160, 160), /entre 400 e 1200/],
        ['a miniatura e grande demais', jpegFalso(800, 800), jpegFalso(800, 800), /miniatura precisa ter entre/],
    ])('recusa com 422 quando a foto %s, sem gravar nada', async (_caso, grande, miniatura, mensagem) => {
        const product = await createProduct();

        const res = await upload(product.id, grande, miniatura);

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(mensagem);
        expect(armazenamento.objetos.size).toBe(0);
        expect((await Product.findByPk(product.id))?.imageUrl).toBeNull();
    });

    it('recusa com 422 quando falta a miniatura', async () => {
        const product = await createProduct();

        const res = await request(app)
            .put(`/products/${product.id}/image`)
            .set('Authorization', `Bearer ${token}`)
            .attach('grande', jpegFalso(800, 800), 'grande.jpg');

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/miniatura não foi enviada/);
    });

    it('recusa com 422 um terceiro arquivo no envio', async () => {
        const product = await createProduct();

        const res = await upload(product.id).attach('outra', jpegFalso(800, 800), 'outra.jpg');

        expect(res.status).toBe(422);
        expect(armazenamento.objetos.size).toBe(0);
    });

    it('404 para produto que nao existe', async () => {
        const res = await upload(999999);
        expect(res.status).toBe(404);
    });

    it('403 para cliente', async () => {
        const product = await createProduct();
        token = tokenFor(await createCustomer());

        const res = await upload(product.id);

        expect(res.status).toBe(403);
        expect(armazenamento.objetos.size).toBe(0);
    });

    it('503 quando o armazenamento nao esta configurado', async () => {
        setImageStorage(null);
        const product = await createProduct();

        const res = await upload(product.id);

        expect(res.status).toBe(503);
    });

    it('502 quando o R2 falha, e o produto continua como estava', async () => {
        const product = await createProduct({ imageUrl: 'https://cdn.externo.com/antiga.jpg' });
        armazenamento.falharEnvio = true;

        const res = await upload(product.id);

        expect(res.status).toBe(502);
        expect((await Product.findByPk(product.id))?.imageUrl).toBe('https://cdn.externo.com/antiga.jpg');
    });

    it('remover a foto limpa o produto e apaga os arquivos', async () => {
        const product = await createProduct();
        await upload(product.id);

        const res = await request(app)
            .delete(`/products/${product.id}/image`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.imageUrl).toBeNull();
        expect(res.body.thumbnailUrl).toBeNull();
        expect(armazenamento.objetos.size).toBe(0);
    });

    it('trocar a URL a mao no cadastro tira a miniatura da foto anterior', async () => {
        const product = await createProduct();
        const withPhoto = await upload(product.id);

        const res = await request(app)
            .put(`/products/${product.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ imageUrl: 'https://cdn.externo.com/nova.jpg' });

        expect(res.status).toBe(200);
        expect(res.body.imageUrl).toBe('https://cdn.externo.com/nova.jpg');
        expect(res.body.thumbnailUrl).toBeNull();
        expect(armazenamento.apagados).toContain(armazenamento.keyFromUrl(withPhoto.body.imageUrl));
    });

    it('editar outro campo nao mexe na foto', async () => {
        const product = await createProduct();
        const withPhoto = await upload(product.id);

        const res = await request(app)
            .put(`/products/${product.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ price: 9.9 });

        expect(res.body.thumbnailUrl).toBe(withPhoto.body.thumbnailUrl);
        expect(armazenamento.apagados).toEqual([]);
    });

    it('excluir o produto apaga os arquivos da foto', async () => {
        const product = await createProduct();
        await upload(product.id);

        const res = await request(app).delete(`/products/${product.id}`).set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(204);
        expect(armazenamento.objetos.size).toBe(0);
    });

    it('a listagem filtra os produtos sem foto', async () => {
        const withPhoto = await createProduct({ name: 'Com foto' });
        await upload(withPhoto.id);
        await createProduct({ name: 'Sem foto' });
        await createProduct({ name: 'Foto vazia', imageUrl: '' });

        const res = await request(app).get('/products?withoutImage=true');

        expect(res.body.data.map((p: Product) => p.name).sort()).toEqual(['Foto vazia', 'Sem foto']);
    });
});
