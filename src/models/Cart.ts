import {
    Table,
    Column,
    Model,
    ForeignKey,
    BelongsTo,
    DataType,
    HasMany
} from 'sequelize-typescript';

import { Customer } from './Customer';
import { CartItem } from './CartItem';

@Table({
    tableName: 'carrinhos',
})
export class Cart extends Model {
    @ForeignKey(() => Customer)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        unique: true,
    })
    declare clienteId: number;

    @BelongsTo(() => Customer)
    cliente!: Customer;

    @HasMany(() => CartItem)
    itens!: CartItem[];
}