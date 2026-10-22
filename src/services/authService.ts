import bcrypt from "bcryptjs";
import jwt  from "jsonwebtoken";
import { UniqueConstraintError } from "sequelize";

import { Customer } from "../models/Customer";
import { CustomerStatus } from "../enum/CustomerStatus";
import { Role } from "../enum/Role";
import { AuditAction } from "../enum/AuditAction";
import { JWT_SECRET } from "../config/auth";
import auditLogService, { AuditEntry } from "./auditLogService";

// Log de login nao pode derrubar o login: se o INSERT falhar, a pessoa entra (ou
// recebe a recusa) igual, e a falha fica no console.
async function recordLogin(entry: AuditEntry) {
    try {
        await auditLogService.record(entry);
    } catch (error) {
        console.error("Falha ao gravar o log de login:", error);
    }
}

class AuthService { 

    async register(
        name: string,
        cpf: string | null,
        phone: string,
        address: string,
        email: string,
        password: string
    ){
        const existingCustomer = await Customer.findOne({
            where: { email }
        });

        if (existingCustomer){
            throw new Error('Email ja cadastrado.');
        }

        // O CPF e opcional no cadastro, entao a checagem de duplicidade so roda
        // quando ele vem: um where com null nao encontraria o que se procura, e
        // varios clientes sem CPF sao legitimos. Quando vem, o UNIQUE do banco
        // ainda vale — sem esta checagem o conflito apareceria como "Validation
        // error" cru do Sequelize, que nao diz nada a quem cadastra.
        if (cpf) {
            const existingCpf = await Customer.findOne({
                where: { cpf }
            });

            if (existingCpf){
                throw new Error('CPF ja cadastrado.');
            }
        }

        const passwordHash = await bcrypt.hash(password, 10);

        try {
            const customer = await Customer.create({
                name,
                cpf: cpf || null,
                phone,
                address,
                email,
                password: passwordHash,
                role: Role.CUSTOMER
            });

            return Customer.findByPk(customer.id);
        } catch (error) {
            // Duas requisicoes simultaneas passam pelas checagens acima e so
            // colidem no indice unico. Traduz para a mesma mensagem do caminho
            // normal, em vez de vazar o erro do banco.
            if (error instanceof UniqueConstraintError) {
                const field = error.errors?.[0]?.path;
                throw new Error(field === 'cpf' ? 'CPF ja cadastrado.' : 'Email ja cadastrado.');
            }
            throw error;
        }
    }

    async login(
        email: string,
        password: string
    ){

        const customer = await Customer.scope('withPassword').findOne({
            where: { email }
        });

        if (!customer){
            await recordLogin({ action: AuditAction.LOGIN_FAILED });
            throw new Error('Credenciais invalidas.');
        }

        // Mesma mensagem de senha errada, de proposito: dizer "conta desativada"
        // confirmaria a um estranho que aquele email existe na base.
        if (customer.status !== CustomerStatus.ACTIVE){
            await recordLogin({ action: AuditAction.LOGIN_DENIED_INACTIVE, userId: customer.id });
            throw new Error('Credenciais invalidas.');
        }

        const validPassword = await bcrypt.compare(
            password,
            customer.password
        );

        if (!validPassword){
            await recordLogin({ action: AuditAction.LOGIN_FAILED, userId: customer.id });
            throw new Error('Credenciais invalidas.');
        }

        await recordLogin({ action: AuditAction.LOGIN_SUCCEEDED, userId: customer.id, createdBy: customer.id });

        const token = jwt.sign(
            {
                id: customer.id,
                role: customer.role
            },
            JWT_SECRET,
            {
                expiresIn: '1d'
            }
        );
            return {
                token,
                customer: {
                    id: customer.id,
                    name: customer.name,
                    email: customer.email,
                    role: customer.role,
                    // O app usa isto para obrigar a troca antes de seguir: a senha
                    // atual foi definida pelo lojista, que a conhece.
                    temporaryPassword: customer.temporaryPassword
                }
            };
        }

    async changePassword(customerId: number, currentPassword: string, newPassword: string) {

        const customer = await Customer.scope('withPassword').findByPk(customerId);

        if (!customer){
            throw new Error('Cliente nao encontrado.');
        }

        const passwordMatches = await bcrypt.compare(currentPassword, customer.password);

        if (!passwordMatches){
            throw new Error('Senha atual incorreta.');
        }

        if (currentPassword === newPassword){
            throw new Error('A nova senha deve ser diferente da atual.');
        }

        customer.password = await bcrypt.hash(newPassword, 10);
        // Deixa de ser temporaria: agora so o dono conhece o valor.
        customer.temporaryPassword = false;
        await customer.save();

        return { message: 'Senha alterada com sucesso.' };
    }
    }

export default new AuthService();
