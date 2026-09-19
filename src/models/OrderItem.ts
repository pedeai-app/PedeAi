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
    })
    declare pedidoId: number;

    @ForeignKey(() => Product)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare produtoId: number;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare quantidade: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare precoUnitario: number;

    @BelongsTo(() => Order)
    declare pedido: Order;

    @BelongsTo(() => Product)
    declare produto: Product;
}