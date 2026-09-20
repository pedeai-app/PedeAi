import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Cart } from '../../../src/models/Cart';
import { Customer } from '../../../src/models/Customer';
import { CartItem } from '../../../src/models/CartItem';
import { Product } from '../../../src/models/Product';

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

export const DEFAULT_PASSWORD = 'senha123';

export async function createCustomer(data: Partial<Customer> = {}): Promise<Customer> {
    const n = proximo();

    return Customer.create({
        name: `Cliente ${n}`,
        cpf: null,
        phone: '41999999999',
        address: `Rua Teste, ${n}`,
        email: `cliente${n}@teste.com`,
        password: await bcrypt.hash(DEFAULT_PASSWORD, 10),
        role: 'CUSTOMER',
        ...data,
    });
}

export function createAdmin(data: Partial<Customer> = {}): Promise<Customer> {
    return createCustomer({ role: 'ADMIN', ...data });
}

export async function createProduct(data: Partial<Product> = {}): Promise<Product> {
    const n = proximo();

    return Product.create({
        name: `Produto ${n}`,
        price: 25.9,
        stock: 10,
        active: true,
        ...data,
    });
}

// Carrinho ja com um item, que e o estado exigido para finalizar um pedido.
export async function createCartWith(
    customer: Customer,
    product: Product,
    quantity = 1,
): Promise<Cart> {
    const cart = await Cart.create({ customerId: customer.id });

    await CartItem.create({
        cartId: cart.id,
        productId: product.id,
        quantity,
        unitPrice: product.price,
    });

    return cart;
}

export function tokenFor(customer: Customer): string {
    return jwt.sign({ id: customer.id, role: customer.role }, process.env.JWT_SECRET as string);
}
