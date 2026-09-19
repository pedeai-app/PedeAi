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
    })
    declare carrinhoId: number;


    @ForeignKey(() => Product)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare produtoId: number;
    
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        defaultValue: 1,
    })
    declare quantidade: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare precoUnitario: number;

    @BelongsTo(() => Cart)
    carrinho!: Cart;

    @BelongsTo(() => Product)
    produto!: Product;
}