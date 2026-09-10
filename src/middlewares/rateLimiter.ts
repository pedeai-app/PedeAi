import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";
import { ATRAS_DE_PROXY } from "../config/proxy";

/**
 * Quem esta sendo limitado.
 *
 * Atras de um proxy, `req.ip` sozinho nao serve: sem `trust proxy` ele e o IP do
 * container que entregou a requisicao, identico para todos os visitantes — e ai
 * um cliente errando a senha cinco vezes tranca o login da loja inteira.
 *
 * O `CF-Connecting-IP` e posto pela borda da Cloudflare e sobrevive ao tunel. So
 * e levado a serio quando ha proxy declarado: sem isso, seria um header que
 * qualquer um manda para escapar do limite.
 *
 * O `ipKeyGenerator` normaliza IPv6 — dois enderecos da mesma /64 contam como um,
 * senao quem tem IPv6 ganha limite infinito trocando de sufixo.
 */
function chaveDoVisitante(req: Request): string {
    if (ATRAS_DE_PROXY) {
        const daCloudflare = req.headers["cf-connecting-ip"];
        if (typeof daCloudflare === "string" && daCloudflare.length > 0) {
            return ipKeyGenerator(daCloudflare);
        }
    }
    return ipKeyGenerator(req.ip ?? "");
}

// Limitador geral da API: protege contra abuso/scraping sem atrapalhar
// o uso normal. Janela de 15 minutos.
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    keyGenerator: chaveDoVisitante,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Muitas requisicoes. Tente novamente mais tarde." },
});

// Limitador estrito para o login: dificulta ataques de forca bruta de
// credenciais. Apenas tentativas mal-sucedidas contam para o limite.
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    keyGenerator: chaveDoVisitante,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { message: "Muitas tentativas de login. Tente novamente em alguns minutos." },
});

// Limitador do cadastro: criar conta e operacao rara para uma pessoa real, e a
// unica rota publica que escreve no banco. Aqui as requisicoes bem-sucedidas
// contam de proposito (ao contrario do login): o que se quer conter e a criacao
// de contas em massa, nao a tentativa que falha.
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    keyGenerator: chaveDoVisitante,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Muitas contas criadas a partir deste endereco. Tente novamente mais tarde." },
});
