import { Table, Column, Model, DataType, Default, HasMany, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { CartItem } from './CartItem';
import { Category } from './Category';

@Table({
    tableName: 'produtos',
})

export class Product extends Model {

    @HasMany(() => CartItem)
    itensCarrinho!: CartItem[];

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
    declare imagemUrl?: string | null;

    // 160x160, para as listas. Nulo quando a foto e uma URL externa digitada a mao.
    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare imagemMiniaturaUrl?: string | null;

    @Default(true)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
    })
    declare ativo: boolean;

    @ForeignKey(() => Category)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare categoriaId?: number;

    @BelongsTo(() => Category)
    declare categoria?: Category;

    // Codigo do produto no sistema de PDV da loja. E a chave que faz a proxima
    // exportacao atualizar este produto em vez de duplicar. Nulo para o que foi
    // cadastrado a mao no admin.
    @Column({
        type: DataType.STRING(40),
        allowNull: true,
        unique: true,
    })
    declare codigoPdv?: string | null;
}

