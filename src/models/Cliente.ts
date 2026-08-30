import { Table, Column, Model, DataType, Unique, CreatedAt, UpdatedAt, HasOne, Default } from 'sequelize-typescript';
import { Carrinho } from './Carrinho';
import { StatusCliente } from '../enum/StatusCliente';

@Table({
    tableName: 'clientes',
    defaultScope: {
        attributes: { exclude: ['senha'] },
    },
    scopes: {
        comSenha: {
            attributes: { include: ['senha'] },
        },
    },
})

export class Cliente extends Model {
    @Column({
        type: DataType.STRING(150),
        allowNull: false,
    })
    declare nome: string;

    @HasOne(() => Carrinho)
    carrinho!: Carrinho;

    // Opcional: so e coletado no checkout, quando o cliente pede CPF na nota.
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
    })
    declare telefone: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare endereco: string;

    @Unique
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare email: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare senha: string;

    // Ligada quando o lojista redefine a senha: ele conhece o valor, entao o app
    // obriga a troca no proximo login e desliga a flag.
    @Default(false)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
    })
    declare senhaTemporaria: boolean;

    @Column({
        type: DataType.ENUM('ADMIN', 'CLIENTE'),
        allowNull: false,
        defaultValue: 'CLIENTE',
    })
    declare role: string;

    // Ciclo de vida do cadastro. Excluir um cliente marca INATIVO em vez de
    // apagar a linha: as FKs de carrinhos e pedidos sao ON DELETE CASCADE, e o
    // historico de vendas nao pode ir junto. Só ATIVO consegue logar.
    @Default(StatusCliente.ATIVO)
    @Column({
        type: DataType.ENUM(...Object.values(StatusCliente)),
        allowNull: false,
    })
    declare status: StatusCliente;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;
}