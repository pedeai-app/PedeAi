import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { apiLimiter } from "./middlewares/rateLimiter";
import { swaggerSpec } from "./config/swagger";
import clienteRoutes from './routes/clienteRoutes';
import produtoRoutes from './routes/produtoRoutes';
import categoriaRoutes from './routes/categoriaRoutes';
import carrinhoRoutes from "./routes/carrinhoRoutes";
import pedidosRoutes from "./routes/pedidosRoutes";
import authRoutes from "./routes/authRoutes"
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler";

const app = express();

// Documentacao Swagger em /docs (spec em JSON em /docs.json). Montada antes do
// helmet global porque a Swagger UI usa scripts/estilos inline que a CSP
// estrita do helmet bloquearia.
app.get("/docs.json", (_req, res) => res.json(swaggerSpec));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
app.use(apiLimiter);

app.use('/clientes', clienteRoutes);
app.use('/produtos', produtoRoutes);
app.use('/categorias', categoriaRoutes);
app.use('/carrinho', carrinhoRoutes);
app.use('/pedidos', pedidosRoutes);
app.use('/auth', authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
