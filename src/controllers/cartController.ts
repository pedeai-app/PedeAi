import { Request, Response } from 'express';
import cartService from '../services/cartService';

class CartController {

    async addProduct(req: Request, res: Response) {
        try {
            const customerId = req.user!.id;
            const { productId, quantity } = req.body;

            const cartItem = await cartService.addProduct(
                Number(customerId),
                productId,
                quantity
            );

            return res.status(201).json(cartItem);
        } catch (error: any) {
            return res.status(400).json({ message: error.message });
        }
    }

    async getCart(req: Request, res: Response) {
        try {
            const  customerId = req.user!.id;

            const cart = await cartService.getCart(customerId);

            return res.json(cart);

        } catch (error: any) {

            return res.status(404).json({ message: error.message });
        }
    }

    async removeProduct(req: Request, res: Response) {
        try {
            const customerId = req.user!.id;
            const { itemId } = req.params;

            const removedItem = await cartService.removeProduct(customerId, Number(itemId));

            return res.json(removedItem);

        } catch (error: any) {

            return res.status(404).json({ message: error.message });
        }
    }

    async clearCart(req: Request, res: Response) {
        try {
            const  customerId  = req.user!.id;

            const clearedCart = await cartService.clearCart(customerId);
            return res.json(clearedCart);
        } catch (error: any) {
            return res.status(404).json({ message: error.message });
        }
    }
}
export default new CartController();