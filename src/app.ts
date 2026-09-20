import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { apiLimiter } from "./middlewares/rateLimiter";
import { PROXY_HOPS } from "./config/proxy";
import { swaggerSpec } from "./config/swagger";
import customerRoutes from './routes/customerRoutes';
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import cartRoutes from "./routes/cartRoutes";
import orderRoutes from "./routes/orderRoutes";
import authRoutes from "./routes/authRoutes"
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler";

const app = express();

// Precisa vir antes de qualquer middleware que leia req.ip — o rate limit e o
// principal. Ver src/config/proxy.ts para o porque do valor.
app.set("trust proxy", PROXY_HOPS);

// Sinal de vida para quem sobe a API: a Cloudflare consulta esta rota ate o
// container responder, antes de mandar trafego. Nao toca no banco de proposito —
// o Neon dorme quando ninguem consulta, e uma checagem de saude que o acordasse
// gastaria as horas do plano gratis sem nenhum visitante. Vem antes do rate limit
// para as checagens nao disputarem a cota de ninguem.
app.get("/ping", (_req, res) => {
    res.type("text/plain").send("ok");
});

// Documentacao Swagger em /docs (spec em JSON em /docs.json). Montada antes do
// helmet global porque a Swagger UI usa scripts/estilos inline que a CSP
// estrita do helmet bloquearia.
app.get("/docs.json", (_req, res) => res.json(swaggerSpec));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
app.use(apiLimiter);

app.use('/customers', customerRoutes);
app.use('/products', productRoutes);
app.use('/categories', categoryRoutes);
app.use('/cart', cartRoutes);
app.use('/orders', orderRoutes);
app.use('/auth', authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
