import { Sequelize } from 'sequelize-typescript';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { Cart } from '../models/Cart';
import { CartItem } from '../models/CartItem';
import { OrderItem } from '../models/OrderItem';
import { Order } from '../models/Order';
import { Category } from '../models/Category';
import { UserPermission } from '../models/UserPermission';
import { AuditLog } from '../models/AuditLog';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error('DATABASE_URL não definida nas variáveis de ambiente.');
}

export const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
    models: [Customer, Product, Cart, CartItem, Order, OrderItem, Category, UserPermission, AuditLog],
});