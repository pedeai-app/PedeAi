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
import { Customer } from './Customer';
import { OrderItem } from './OrderItem';
import { OrderStatus } from '../enum/OrderStatus';

@Table({
    tableName: 'pedidos',
})
export class Order extends Model {

    @ForeignKey(() => Customer)
    @Column({
    type: DataType.INTEGER,
    allowNull: false,
    })
    declare clienteId: number;

    @BelongsTo(() => Customer)
    declare cliente: Customer;

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

    // CPF na nota daquela venda. Opcional e por pedido: nao e o CPF do cadastro.
    @Column({
        type: DataType.STRING(11),
        allowNull: true,
    })
    declare cpfNota: string | null;

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
    declare status: OrderStatus;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare valorTotal: number;

    @HasMany(() => OrderItem)
    declare itens: OrderItem[];
}
