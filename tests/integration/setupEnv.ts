import 'reflect-metadata';
import { urlBancoTeste } from './helpers/config';

// Roda ANTES de qualquer import dos testes. Precisa ser aqui porque
// src/config/database.ts cria a instancia do Sequelize no momento do import,
// lendo DATABASE_URL: definir depois nao teria efeito.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.DATABASE_URL = urlBancoTeste();

// Espelha producao: a API roda atras do cloudflared e do Caddy. Sem isto, o teste
// do rate limit por visitante nao teria como distinguir dois visitantes.
process.env.TRUST_PROXY = process.env.TRUST_PROXY || '2';
