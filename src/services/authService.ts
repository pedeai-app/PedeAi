import bcrypt from "bcryptjs";
import jwt  from "jsonwebtoken";
import { UniqueConstraintError } from "sequelize";

import { Cliente } from "../models/Cliente";
import { StatusCliente } from "../enum/StatusCliente";
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
        const clienteExistente = await Cliente.findOne({
            where: { email }
        });

        if (clienteExistente){
            throw new Error('Email ja cadastrado.');
        }

        // O CPF e opcional no cadastro, entao a checagem de duplicidade so roda
        // quando ele vem: um where com null nao encontraria o que se procura, e
        // varios clientes sem CPF sao legitimos. Quando vem, o UNIQUE do banco
        // ainda vale — sem esta checagem o conflito apareceria como "Validation
        // error" cru do Sequelize, que nao diz nada a quem cadastra.
        if (cpf) {
            const cpfExistente = await Cliente.findOne({
                where: { cpf }
            });

            if (cpfExistente){
                throw new Error('CPF ja cadastrado.');
            }
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        try {
            const cliente = await Cliente.create({
                nome,
                cpf: cpf || null,
                telefone,
                endereco,
                email,
                senha: senhaHash,
                role: 'CLIENTE'
            });

            return Cliente.findByPk(cliente.id);
        } catch (error) {
            // Duas requisicoes simultaneas passam pelas checagens acima e so
            // colidem no indice unico. Traduz para a mesma mensagem do caminho
            // normal, em vez de vazar o erro do banco.
            if (error instanceof UniqueConstraintError) {
                const campo = error.errors?.[0]?.path;
                throw new Error(campo === 'cpf' ? 'CPF ja cadastrado.' : 'Email ja cadastrado.');
            }
            throw error;
        }
    }

    async login(
        email: string,
        senha: string
    ){

        const cliente = await Cliente.scope('comSenha').findOne({
            where: { email }
        });

        if (!cliente){
            throw new Error('Credenciais invalidas.');
        }

        // Mesma mensagem de senha errada, de proposito: dizer "conta desativada"
        // confirmaria a um estranho que aquele email existe na base.
        if (cliente.status !== StatusCliente.ATIVO){
            throw new Error('Credenciais invalidas.');
        }

        const senhaValida = await bcrypt.compare(
            senha,
            cliente.senha
        );

        if (!senhaValida){
            throw new Error('Credenciais invalidas.');
        }

        const token = jwt.sign(
            {
                id: cliente.id,
                role: cliente.role
            },
            JWT_SECRET,
            {
                expiresIn: '1d'
            }
        );
            return {
                token,
                cliente: {
                    id: cliente.id,
                    nome: cliente.nome,
                    email: cliente.email,
                    role: cliente.role,
                    // O app usa isto para obrigar a troca antes de seguir: a senha
                    // atual foi definida pelo lojista, que a conhece.
                    senhaTemporaria: cliente.senhaTemporaria
                }
            };
        }

    async trocarSenha(clienteId: number, senhaAtual: string, novaSenha: string) {

        const cliente = await Cliente.scope('comSenha').findByPk(clienteId);

        if (!cliente){
            throw new Error('Cliente nao encontrado.');
        }

        const senhaConfere = await bcrypt.compare(senhaAtual, cliente.senha);

        if (!senhaConfere){
            throw new Error('Senha atual incorreta.');
        }

        if (senhaAtual === novaSenha){
            throw new Error('A nova senha deve ser diferente da atual.');
        }

        cliente.senha = await bcrypt.hash(novaSenha, 10);
        // Deixa de ser temporaria: agora so o dono conhece o valor.
        cliente.senhaTemporaria = false;
        await cliente.save();

        return { message: 'Senha alterada com sucesso.' };
    }
    }

export default new AuthService();
