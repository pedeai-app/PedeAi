import { Table, Column, Model, DataType, Default, Unique, HasMany } from 'sequelize-typescript';
import { Product } from './Product';

@Table({
    tableName: 'categorias',
})

export class Category extends Model {

    @Unique
    @Column({
        type: DataType.STRING(100),
        allowNull: false,
    })
    declare nome: string;

    @Default(true)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
    })
    declare ativo: boolean;

    @HasMany(() => Product)
    declare produtos: Product[];
}
