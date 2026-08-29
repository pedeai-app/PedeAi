import { Table, Column, Model, DataType, Unique, CreatedAt, UpdatedAt, HasOne, Default } from 'sequelize-typescript';
import { Carrinho } from './Carrinho';

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

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;
}