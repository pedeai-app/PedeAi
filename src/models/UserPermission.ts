import { Table, Column, Model, DataType, ForeignKey, BelongsTo, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { Customer } from './Customer';
import { Permission } from '../enum/Permission';

// Permissao extra, alem das que o papel ja traz (ver ROLE_PERMISSIONS). E
// configuracao: pode ser revogada, e toda concessao ou revogacao vai para o log.
@Table({
    tableName: 'permissoes_usuario',
})
export class UserPermission extends Model {

    @ForeignKey(() => Customer)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        field: 'usuarioId',
    })
    declare userId: number;

    @BelongsTo(() => Customer, 'userId')
    user!: Customer;

    @Column({
        type: DataType.STRING(50),
        allowNull: false,
        field: 'permissao',
    })
    declare permission: Permission;

    @ForeignKey(() => Customer)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
        field: 'concedidaPor',
    })
    declare grantedBy: number | null;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;
}
