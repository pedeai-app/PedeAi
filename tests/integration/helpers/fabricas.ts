import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Carrinho } from '../../../src/models/Carrinho';
import { Cliente } from '../../../src/models/Cliente';
import { ItemCarrinho } from '../../../src/models/ItemCarrinho';
import { Produto } from '../../../src/models/Produto';

// Fabricas de dados para os testes. Existem para que montar o cenario de um
// teste custe uma linha: sem elas, testar "finalizar pedido" exige vinte linhas
// de preparacao e o segundo teste nunca e escrito.

let sequencia = 0;

// Email/CPF unicos por chamada. As tabelas sao truncadas entre os testes, mas
// dentro de um mesmo teste duas fabricas seguidas colidiriam nos indices unicos.
function proximo(): number {
    sequencia += 1;
    return sequencia;
}

export const SENHA_PADRAO = 'senha123';

export async function criarCliente(dados: Partial<Cliente> = {}): Promise<Cliente> {
    const n = proximo();

    return Cliente.create({
        nome: `Cliente ${n}`,
        cpf: null,
        telefone: '41999999999',
        endereco: `Rua Teste, ${n}`,
        email: `cliente${n}@teste.com`,
        senha: await bcrypt.hash(SENHA_PADRAO, 10),
        role: 'CLIENTE',
        ...dados,
    });
}

export function criarAdmin(dados: Partial<Cliente> = {}): Promise<Cliente> {
    return criarCliente({ role: 'ADMIN', ...dados });
}

export async function criarProduto(dados: Partial<Produto> = {}): Promise<Produto> {
    const n = proximo();

    return Produto.create({
        nome: `Produto ${n}`,
        preco: 25.9,
        estoque: 10,
        ativo: true,
        ...dados,
    });
}

// Carrinho ja com um item, que e o estado exigido para finalizar um pedido.
export async function criarCarrinhoCom(
    cliente: Cliente,
    produto: Produto,
    quantidade = 1,
): Promise<Carrinho> {
    const carrinho = await Carrinho.create({ clienteId: cliente.id });

    await ItemCarrinho.create({
        carrinhoId: carrinho.id,
        produtoId: produto.id,
        quantidade,
        precoUnitario: produto.preco,
    });

    return carrinho;
}

export function tokenDe(cliente: Cliente): string {
    return jwt.sign({ id: cliente.id, role: cliente.role }, process.env.JWT_SECRET as string);
}
