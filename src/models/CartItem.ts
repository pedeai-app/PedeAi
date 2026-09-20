import { 
    Table, Column, Model, ForeignKey, BelongsTo, 
    DataType
} from 'sequelize-typescript';

import { Cart } from './Cart';
import { Product } from './Product';

@Table({
    tableName: 'itens_carrinho',
})
export class CartItem extends Model {

    @ForeignKey(() => Cart)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        field: 'carrinhoId',
    })
    declare cartId: number;


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
        defaultValue: 1,
        field: 'quantidade',
    })
    declare quantity: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
        field: 'precoUnitario',
    })
    declare unitPrice: number;

    @BelongsTo(() => Cart)
    cart!: Cart;

    @BelongsTo(() => Product)
    product!: Product;
}