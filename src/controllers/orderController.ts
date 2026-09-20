import { Request, Response } from "express";
import orderService, { OrderFilters } from "../services/orderService";
import { OrderStatus } from "../enum/OrderStatus";
import { getPaginationParams, buildPaginatedResult } from "../utils/pagination";

// Le os filtros de busca da query string ja validados pelo middleware.
function getOrderFilters(query: Request["query"]): OrderFilters {
    const filters: OrderFilters = {};

    if (typeof query.status === "string") {
        filters.status = query.status as OrderStatus;
    }

    const customerId = Number(query.customerId);
    if (Number.isInteger(customerId) && customerId > 0) {
        filters.customerId = customerId;
    }

    return filters;
}

class OrderController {
    
    async checkout(req: Request, res: Response) {
        try {
            const customerId = req.user!.id;
            // Campo opcional do checkout; vazio vira null para nao gravar "".
            const invoiceCpf = typeof req.body?.invoiceCpf === "string" && req.body.invoiceCpf.trim()
                ? req.body.invoiceCpf.trim()
                : null;

            const order = await orderService.checkout(customerId, invoiceCpf);

            return res.status(201).json(order);

        } catch (error: any) {

            return res.status(400).json({ message: error.message });
        }
    }

    async listOrders(req: Request, res: Response) {

        try {

            const { page, limit, offset } = getPaginationParams(req.query);
            const filters = getOrderFilters(req.query);
            const { rows, count } = await orderService.listOrders({ page, limit, offset }, filters);

            return res.json(buildPaginatedResult(rows, count, page, limit));

        } catch (error: any) {

            return res.status(500).json({ message: error.message });
        }
    }

    async getOrderById(req: Request, res: Response) {

        try {

            const { orderId } = req.params;

            const order = await orderService.getOrderById(Number(orderId));

            return res.json(order);

        } catch (error: any) {

            return res.status(404).json({ message: error.message });
        }
    }

    async listCustomerOrders(req: Request, res: Response) {

        try {

            const customerId  = req.user!.id;

            const { page, limit, offset } = getPaginationParams(req.query);
            const { rows, count } = await orderService.listCustomerOrders(customerId, { page, limit, offset });

            return res.json(buildPaginatedResult(rows, count, page, limit));

        } catch (error: any) {

            return res.status(500).json({ message: error.message });
        }
    }

    async updateOrderStatus(req: Request, res: Response) {
        try {

            const { orderId } = req.params;
            const { status } = req.body;

            const order = await orderService.updateOrderStatus(Number(orderId), status);

            return res.json(order);

        } catch (error: any) {

            return res.status(400).json({ message: error.message });
        }
    }           
}

export default new OrderController();
