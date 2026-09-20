import { Table, Column, Model, DataType, Default, HasMany, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { CartItem } from './CartItem';
import { Category } from './Category';

@Table({
    tableName: 'produtos',
})

export class Product extends Model {

    @HasMany(() => CartItem)
    cartItems!: CartItem[];

    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'nome',
    })
   declare name: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'descricao',
    })
    declare description?: string;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
        field: 'preco',
    })
    declare price: number;

    @Default(0)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        field: 'estoque',
    })
    declare stock: number;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'imagemUrl',
    })
    declare imageUrl?: string | null;

    // 160x160, para as listas. Nulo quando a foto e uma URL externa digitada a mao.
    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'imagemMiniaturaUrl',
    })
    declare thumbnailUrl?: string | null;

    @Default(true)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        field: 'ativo',
    })
    declare active: boolean;

    @ForeignKey(() => Category)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
        field: 'categoriaId',
    })
    declare categoryId?: number;

    @BelongsTo(() => Category)
    declare category?: Category;

    // Codigo do product no sistema de PDV da loja. E a chave que faz a proxima
    // exportacao atualizar este product em vez de duplicar. Nulo para o que foi
    // cadastrado a mao no admin.
    @Column({
        type: DataType.STRING(40),
        allowNull: true,
        unique: true,
        field: 'codigoPdv',
    })
    declare pdvCode?: string | null;
}

