import { Table, Column, Model, DataType, Default, Unique, HasMany } from 'sequelize-typescript';
import { Produto } from './Produto';

@Table({
    tableName: 'categorias',
})

export class Categoria extends Model {

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

    @HasMany(() => Produto)
    declare produtos: Produto[];
}
