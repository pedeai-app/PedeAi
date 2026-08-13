import { Table, Column, Model, DataType, Default, HasMany, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { ItemCarrinho } from './ItemCarrinho';
import { Categoria } from './Categoria';

@Table({
    tableName: 'produtos',
})

export class Produto extends Model {

    @HasMany(() => ItemCarrinho)
    itensCarrinho!: ItemCarrinho[];

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
   declare nome: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare descricao?: string;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare preco: number;

    @Default(0)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare estoque: number;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare imagemUrl?: string;

    @Default(true)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
    })
    declare ativo: boolean;

    @ForeignKey(() => Categoria)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare categoriaId?: number;

    @BelongsTo(() => Categoria)
    declare categoria?: Categoria;
}

