import { Table, Column, Model, DataType, ForeignKey, CreatedAt } from 'sequelize-typescript';
import { Customer } from './Customer';
import { AuditOrigin } from '../enum/AuditAction';

// Registro do que nao gera dado de negocio: login, alteracao de configuracao,
// acao negada. Nasce na API e no PDV, por isso o id e UUID gerado na origem —
// o PDV manda o seu e reenviar nao duplica. Nunca e alterado nem apagado.
@Table({
    tableName: 'logs_auditoria',
    updatedAt: false,
})
export class AuditLog extends Model {

    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    // A quem o registro se refere. Nulo quando ninguem foi identificado (login
    // com email que nao existe).
    @ForeignKey(() => Customer)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
        field: 'usuarioId',
    })
    declare userId: number | null;

    @Column({
        type: DataType.STRING(60),
        allowNull: false,
        field: 'acao',
    })
    declare action: string;

    @Column({
        type: DataType.JSONB,
        allowNull: true,
        field: 'detalhes',
    })
    declare details: Record<string, unknown> | null;

    // Quem estava logado ao gerar o registro. Nulo antes do login.
    @ForeignKey(() => Customer)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
        field: 'criadoPor',
    })
    declare createdBy: number | null;

    @Column({
        type: DataType.ENUM(...Object.values(AuditOrigin)),
        allowNull: false,
        defaultValue: AuditOrigin.API,
        field: 'origem',
    })
    declare origin: AuditOrigin;

    @CreatedAt
    declare createdAt: Date;
}
