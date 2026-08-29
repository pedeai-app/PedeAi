import { 
    Table, 
    Column,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
    HasMany,
    Default

} from 'sequelize-typescript';
import { Cliente } from './Cliente';
import { ItemPedido } from './ItemPedido';
import { StatusPedido } from '../enum/StatusPedido';

@Table({
    tableName: 'pedidos',
})
export class Pedido extends Model {

    @ForeignKey(() => Cliente)
    @Column({
    type: DataType.INTEGER,
    allowNull: false,
    })
    declare clienteId: number;

    @BelongsTo(() => Cliente)
    declare cliente: Cliente;

    @Column({
        type: DataType.STRING(150),
        allowNull: false,
    })
    declare nomeCliente: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare enderecoEntrega: string;

    @Column({
        type: DataType.ENUM(
            'PENDENTE', 
            'CONFIRMADO', 
            'EM_PREPARO', 
            'SAIU_PARA_ENTREGA', 
            'ENTREGUE', 
            'CANCELADO'),
        allowNull: false,
    })
    declare status: StatusPedido;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare valorTotal: number;

    @HasMany(() => ItemPedido)
    declare itens: ItemPedido[];
}
