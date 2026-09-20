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
    field: 'clienteId',
})
    declare customerId: number;

    @BelongsTo(() => Customer)
    declare customer: Customer;

    @Column({
        type: DataType.STRING(150),
        allowNull: false,
        field: 'nomeCliente',
    })
    declare customerName: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'enderecoEntrega',
    })
    declare deliveryAddress: string;

    // CPF na nota daquela venda. Opcional e por order: nao e o CPF do cadastro.
    @Column({
        type: DataType.STRING(11),
        allowNull: true,
        field: 'cpfNota',
    })
    declare invoiceCpf: string | null;

    @Column({
        type: DataType.ENUM(
            'PENDING', 
            'CONFIRMED', 
            'PREPARING', 
            'OUT_FOR_DELIVERY', 
            'DELIVERED', 
            'CANCELLED'),
        allowNull: false,
    })
    declare status: OrderStatus;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'valorTotal',
    })
    declare totalAmount: number;

    @HasMany(() => OrderItem)
    declare items: OrderItem[];
}
