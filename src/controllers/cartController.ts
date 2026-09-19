import { Request, Response } from 'express';
import cartService from '../services/cartService';

class CartController {

    async addProduct(req: Request, res: Response) {
        try {
            const clienteId = req.user!.id;
            const { produtoId, quantidade } = req.body;

            const itemCarrinho = await cartService.addProduct(
                Number(clienteId),
                produtoId,
                quantidade
            );

            return res.status(201).json(itemCarrinho);
        } catch (error: any) {
            return res.status(400).json({ message: error.message });
        }
    }

    async getCart(req: Request, res: Response) {
        try {
            const  clienteId = req.user!.id;

            const cart = await cartService.getCart(clienteId);

            return res.json(cart);

        } catch (error: any) {

            return res.status(404).json({ message: error.message });
        }
    }

    async removeProduct(req: Request, res: Response) {
        try {
            const clienteId = req.user!.id;
            const { itemId } = req.params;

            const removedItem = await cartService.removeProduct(clienteId, Number(itemId));

            return res.json(removedItem);

        } catch (error: any) {

            return res.status(404).json({ message: error.message });
        }
    }

    async clearCart(req: Request, res: Response) {
        try {
            const  clienteId  = req.user!.id;

            const carrinhoLimpo = await cartService.clearCart(clienteId);
            return res.json(carrinhoLimpo);
        } catch (error: any) {
            return res.status(404).json({ message: error.message });
        }
    }
}
export default new CartController();