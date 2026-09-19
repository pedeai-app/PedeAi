import bcrypt from "bcryptjs";
import jwt  from "jsonwebtoken";
import { UniqueConstraintError } from "sequelize";

import { Customer } from "../models/Customer";
import { CustomerStatus } from "../enum/CustomerStatus";
import { JWT_SECRET } from "../config/auth";

class AuthService { 

    async register(
        nome: string,
        cpf: string | null,
        telefone: string,
        endereco: string,
        email: string,
        senha: string
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

        const passwordHash = await bcrypt.hash(senha, 10);

        try {
            const customer = await Customer.create({
                nome,
                cpf: cpf || null,
                telefone,
                endereco,
                email,
                senha: passwordHash,
                role: 'CLIENTE'
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
        senha: string
    ){

        const customer = await Customer.scope('comSenha').findOne({
            where: { email }
        });

        if (!customer){
            throw new Error('Credenciais invalidas.');
        }

        // Mesma mensagem de senha errada, de proposito: dizer "conta desativada"
        // confirmaria a um estranho que aquele email existe na base.
        if (customer.status !== CustomerStatus.ATIVO){
            throw new Error('Credenciais invalidas.');
        }

        const validPassword = await bcrypt.compare(
            senha,
            customer.senha
        );

        if (!validPassword){
            throw new Error('Credenciais invalidas.');
        }

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
                cliente: {
                    id: customer.id,
                    nome: customer.nome,
                    email: customer.email,
                    role: customer.role,
                    // O app usa isto para obrigar a troca antes de seguir: a senha
                    // atual foi definida pelo lojista, que a conhece.
                    senhaTemporaria: customer.senhaTemporaria
                }
            };
        }

    async changePassword(clienteId: number, currentPassword: string, newPassword: string) {

        const customer = await Customer.scope('comSenha').findByPk(clienteId);

        if (!customer){
            throw new Error('Cliente nao encontrado.');
        }

        const passwordMatches = await bcrypt.compare(currentPassword, customer.senha);

        if (!passwordMatches){
            throw new Error('Senha atual incorreta.');
        }

        if (currentPassword === newPassword){
            throw new Error('A nova senha deve ser diferente da atual.');
        }

        customer.senha = await bcrypt.hash(newPassword, 10);
        // Deixa de ser temporaria: agora so o dono conhece o valor.
        customer.senhaTemporaria = false;
        await customer.save();

        return { message: 'Senha alterada com sucesso.' };
    }
    }

export default new AuthService();
