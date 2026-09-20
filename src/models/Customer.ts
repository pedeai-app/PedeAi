import { Table, Column, Model, DataType, Unique, CreatedAt, UpdatedAt, HasOne, Default } from 'sequelize-typescript';
import { Cart } from './Cart';
import { CustomerStatus } from '../enum/CustomerStatus';

@Table({
    tableName: 'clientes',
    defaultScope: {
        attributes: { exclude: ['password'] },
    },
    scopes: {
        withPassword: {
            attributes: { include: ['password'] },
        },
    },
})

export class Customer extends Model {
    @Column({
        type: DataType.STRING(150),
        allowNull: false,
        field: 'nome',
    })
    declare name: string;

    @HasOne(() => Cart)
    cart!: Cart;

    // Opcional: so e coletado no checkout, quando o customer pede CPF na nota.
    // O UNIQUE segue valendo — o Postgres aceita varios NULL numa coluna unica.
    @Unique
    @Column({
        type: DataType.STRING(11),
        allowNull: true,
    })
    declare cpf: string | null;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'telefone',
    })
    declare phone: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'endereco',
    })
    declare address: string;

    @Unique
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare email: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'senha',
    })
    declare password: string;

    // Ligada quando o lojista redefine a password: ele conhece o valor, entao o app
    // obriga a troca no proximo login e desliga a flag.
    @Default(false)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        field: 'senhaTemporaria',
    })
    declare temporaryPassword: boolean;

    @Column({
        type: DataType.ENUM('ADMIN', 'CUSTOMER'),
        allowNull: false,
        defaultValue: 'CUSTOMER',
    })
    declare role: string;

    // Ciclo de vida do cadastro. Excluir um customer marca INATIVO em vez de
    // apagar a linha: as FKs de carrinhos e pedidos sao ON DELETE CASCADE, e o
    // historico de vendas nao pode ir junto. Só ATIVO consegue logar.
    @Default(CustomerStatus.ACTIVE)
    @Column({
        type: DataType.ENUM(...Object.values(CustomerStatus)),
        allowNull: false,
    })
    declare status: CustomerStatus;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;
}