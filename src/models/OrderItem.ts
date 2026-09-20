import { Table, Column, Model, ForeignKey, BelongsTo, DataType } from 'sequelize-typescript';

import { Order } from './Order';
import { Product } from './Product';


@Table({
    tableName: 'itens_pedido',
})

export class OrderItem extends Model {

    @ForeignKey(() => Order)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        field: 'pedidoId',
    })
    declare orderId: number;

    @ForeignKey(() => Product)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        field: 'produtoId',
    })
    declare productId: number;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        field: 'quantidade',
    })
    declare quantity: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
        field: 'precoUnitario',
    })
    declare unitPrice: number;

    @BelongsTo(() => Order)
    declare order: Order;

    @BelongsTo(() => Product)
    declare product: Product;
}