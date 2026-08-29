import rateLimit from "express-rate-limit";

// Limitador geral da API: protege contra abuso/scraping sem atrapalhar
// o uso normal. Janela de 15 minutos.
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Muitas requisicoes. Tente novamente mais tarde." },
});

// Limitador estrito para o login: dificulta ataques de forca bruta de
// credenciais. Apenas tentativas mal-sucedidas contam para o limite.
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
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
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Muitas contas criadas a partir deste endereco. Tente novamente mais tarde." },
});
