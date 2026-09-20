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
        field: 'nome',
    })
    declare name: string;

    @Default(true)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        field: 'ativo',
    })
    declare active: boolean;

    @HasMany(() => Product)
    declare products: Product[];
}
