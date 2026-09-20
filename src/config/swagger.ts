// Especificacao OpenAPI 3.0 da API do PedeAi, servida via swagger-ui-express
// em /docs (ver src/app.ts). Mantida de forma centralizada para refletir as
// rotas em src/routes e os validators em src/validators.

const bearerAuth = [{ bearerAuth: [] }];

// Resposta paginada padrao (envelope { data, pagination }) usado nas listagens.
const paginatedResponse = (ref: string) => ({
    type: "object",
    properties: {
        data: { type: "array", items: { $ref: ref } },
        pagination: { $ref: "#/components/schemas/Pagination" },
    },
});

export const swaggerSpec = {
    openapi: "3.0.3",
    info: {
        title: "PedeAi API",
        version: "1.0.0",
        description:
            "API de delivery/e-commerce do PedeAi. Autenticacao via JWT (Bearer). " +
            "Rotas marcadas com cadeado exigem token; algumas exigem role ADMIN.",
    },
    servers: [{ url: "/", description: "Servidor atual" }],
    tags: [
        { name: "Auth", description: "Registro, login e perfil" },
        { name: "Clientes", description: "Gestao de clientes (ADMIN)" },
        { name: "Produtos", description: "Catalogo de produtos" },
        { name: "Carrinho", description: "Carrinho do cliente autenticado" },
        { name: "Pedidos", description: "Pedidos e seus status" },
        { name: "Infra", description: "Saude da API" },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
            },
        },
        parameters: {
            PageParam: {
                name: "page",
                in: "query",
                required: false,
                description: "Numero da pagina (default 1).",
                schema: { type: "integer", minimum: 1, default: 1 },
            },
            LimitParam: {
                name: "limit",
                in: "query",
                required: false,
                description: "Itens por pagina (default 10, maximo 100).",
                schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            },
            IdPath: {
                name: "id",
                in: "path",
                required: true,
                description: "Identificador do recurso.",
                schema: { type: "integer", minimum: 1 },
            },
        },
        schemas: {
            Pagination: {
                type: "object",
                properties: {
                    page: { type: "integer", example: 1 },
                    limit: { type: "integer", example: 10 },
                    total: { type: "integer", example: 42 },
                    totalPages: { type: "integer", example: 5 },
                },
            },
            Error: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Recurso nao encontrado." },
                },
            },
            ValidationError: {
                type: "object",
                properties: {
                    errors: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                type: { type: "string", example: "field" },
                                msg: { type: "string", example: "O email e obrigatorio." },
                                path: { type: "string", example: "email" },
                                location: { type: "string", example: "body" },
                            },
                        },
                    },
                },
            },
            Customer: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    name: { type: "string", example: "Maria Silva" },
                    cpf: { type: "string", example: "12345678901" },
                    phone: { type: "string", example: "11999998888" },
                    address: { type: "string", example: "Rua A, 100" },
                    email: { type: "string", example: "maria@email.com" },
                    role: { type: "string", enum: ["ADMIN", "CUSTOMER"], example: "CUSTOMER" },
                    status: { type: "string", enum: ["ACTIVE", "INACTIVE", "ANONYMIZED"], example: "ACTIVE" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            // Corpo do PUT /clientes/{id}. Todos os campos sao opcionais: a rota
            // aceita atualizacao parcial, e o que nao vier fica como esta.
            CustomerInput: {
                type: "object",
                properties: {
                    name: { type: "string", minLength: 3, maxLength: 150, example: "Maria Silva" },
                    cpf: { type: "string", pattern: "^\\d{11}$", example: "12345678901" },
                    phone: { type: "string", pattern: "^\\d{10,11}$", example: "11999998888" },
                    address: { type: "string", example: "Rua A, 100" },
                },
            },
            Product: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    name: { type: "string", example: "X-Burger" },
                    description: { type: "string", nullable: true, example: "Hamburguer artesanal" },
                    price: { type: "string", example: "25.90" },
                    stock: { type: "integer", example: 50 },
                    imageUrl: { type: "string", nullable: true, example: "https://imagens.jacobsbeer.com.br/produtos/1/a1b2c3d4e5f6-800.jpg" },
                    thumbnailUrl: {
                        type: "string",
                        nullable: true,
                        readOnly: true,
                        example: "https://imagens.jacobsbeer.com.br/produtos/1/a1b2c3d4e5f6-160.jpg",
                        description:
                            "Versao 160x160 da foto, para listas. Preenchida por PUT /produtos/{id}/imagem; " +
                            "nula quando a foto e uma URL externa.",
                    },
                    active: { type: "boolean", example: true },
                    pdvCode: {
                        type: "string",
                        nullable: true,
                        readOnly: true,
                        example: "217",
                        description:
                            "Codigo do produto no sistema de PDV da loja. Preenchido pela importacao " +
                            "(npm run importar:produtos); nulo para produto cadastrado no admin. Nao e " +
                            "aceito no POST nem no PUT.",
                    },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            ProductInput: {
                type: "object",
                required: ["nome", "preco"],
                properties: {
                    name: { type: "string", minLength: 2, maxLength: 255, example: "X-Burger" },
                    description: { type: "string", example: "Hamburguer artesanal" },
                    price: { type: "number", format: "float", minimum: 0, example: 25.9 },
                    stock: { type: "integer", minimum: 0, example: 50 },
                    imageUrl: { type: "string", format: "uri", example: "https://cdn/x.png" },
                    active: { type: "boolean", example: true },
                },
            },
            OrderItem: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    orderId: { type: "integer", example: 1 },
                    productId: { type: "integer", example: 1 },
                    quantity: { type: "integer", example: 2 },
                    unitPrice: { type: "string", example: "25.90" },
                    product: { $ref: "#/components/schemas/Product" },
                },
            },
            // Dados do cliente embutidos no pedido. Sao dois recortes distintos:
            // a listagem ADMIN expoe o minimo para identificar quem comprou, e o
            // detalhe acrescenta o contato necessario para a entrega. O CPF nunca
            // e exposto em nenhum dos dois.
            CustomerSummary: {
                type: "object",
                description: "Identificacao do cliente dono do pedido (listagem ADMIN).",
                properties: {
                    id: { type: "integer", example: 1 },
                    name: { type: "string", example: "Maria Silva" },
                    email: { type: "string", example: "maria@email.com" },
                },
            },
            CustomerDelivery: {
                type: "object",
                description: "Cliente com os dados de contato atuais (detalhe do pedido, ADMIN). O endereco de entrega esta no snapshot do pedido.",
                properties: {
                    id: { type: "integer", example: 1 },
                    name: { type: "string", example: "Maria Silva" },
                    email: { type: "string", example: "maria@email.com" },
                    phone: { type: "string", example: "11999998888" },
                },
            },
            Order: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    customerId: { type: "integer", example: 1 },
                    status: {
                        type: "string",
                        enum: [
                            "PENDING",
                            "CONFIRMED",
                            "PREPARING",
                            "OUT_FOR_DELIVERY",
                            "DELIVERED",
                            "CANCELLED",
                        ],
                        example: "PENDING",
                    },
                    totalAmount: { type: "string", example: "51.80" },
                    customerName: {
                        type: "string",
                        description: "Nome do cliente no fechamento do pedido; nao acompanha alteracoes posteriores no cadastro.",
                        example: "Maria Silva",
                    },
                    deliveryAddress: {
                        type: "string",
                        description: "Endereco de entrega no fechamento do pedido; nao acompanha alteracoes posteriores no cadastro.",
                        example: "Rua A, 100",
                    },
                    invoiceCpf: {
                        type: "string",
                        nullable: true,
                        description: "CPF informado para a nota desta venda, quando o cliente pediu. Nao e o CPF do cadastro.",
                        example: "12345678901",
                    },
                    customer: { $ref: "#/components/schemas/CustomerSummary" },
                    items: { type: "array", items: { $ref: "#/components/schemas/OrderItem" } },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            OrderDetail: {
                allOf: [
                    { $ref: "#/components/schemas/Order" },
                    {
                        type: "object",
                        properties: {
                            customer: { $ref: "#/components/schemas/CustomerDelivery" },
                        },
                    },
                ],
            },
            RegisterInput: {
                type: "object",
                required: ["nome", "telefone", "endereco", "email", "senha"],
                properties: {
                    name: { type: "string", minLength: 3, maxLength: 150, example: "Maria Silva" },
                    cpf: {
                        type: "string",
                        nullable: true,
                        pattern: "^\\d{11}$",
                        description: "Opcional. O CPF e pedido no checkout, para a nota da venda.",
                        example: "12345678901",
                    },
                    phone: { type: "string", pattern: "^\\d{10,11}$", example: "11999998888" },
                    address: { type: "string", example: "Rua A, 100" },
                    email: { type: "string", format: "email", example: "maria@email.com" },
                    password: { type: "string", minLength: 6, example: "senha123" },
                },
            },
            LoginInput: {
                type: "object",
                required: ["email", "senha"],
                properties: {
                    email: { type: "string", format: "email", example: "admin@pedeai.com" },
                    password: { type: "string", example: "senha123" },
                },
            },
            AuthResponse: {
                type: "object",
                properties: {
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsIn..." },
                    customer: {
                        type: "object",
                        properties: {
                            id: { type: "integer", example: 1 },
                            name: { type: "string", example: "Admin" },
                            email: { type: "string", example: "admin@pedeai.com" },
                            role: { type: "string", example: "ADMIN" },
                            temporaryPassword: {
                                type: "boolean",
                                description: "true quando a senha foi redefinida pelo lojista. O app deve exigir a troca antes de seguir.",
                                example: false,
                            },
                        },
                    },
                },
            },
            CartItemInput: {
                type: "object",
                required: ["produtoId", "quantidade"],
                properties: {
                    productId: { type: "integer", minimum: 1, example: 1 },
                    quantity: { type: "integer", minimum: 1, example: 2 },
                },
            },
            StatusUpdateInput: {
                type: "object",
                required: ["status"],
                properties: {
                    status: {
                        type: "string",
                        enum: [
                            "PENDING",
                            "CONFIRMED",
                            "PREPARING",
                            "OUT_FOR_DELIVERY",
                            "DELIVERED",
                            "CANCELLED",
                        ],
                        example: "CONFIRMED",
                    },
                },
            },
        },
        responses: {
            Unauthorized: {
                description: "Token ausente ou invalido",
                content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
            Forbidden: {
                description: "Sem permissao (requer role ADMIN)",
                content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
            NotFound: {
                description: "Recurso nao encontrado",
                content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
            ValidationFailed: {
                description: "Falha de validacao",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ValidationError" },
                    },
                },
            },
        },
    },
    paths: {
        "/ping": {
            get: {
                tags: ["Infra"],
                summary: "Sinal de vida da API (nao consulta o banco)",
                description:
                    "Usado pela Cloudflare para saber se o container ja subiu. Fica fora do rate limit e nao acorda o banco.",
                security: [],
                responses: {
                    "200": {
                        description: "API de pe",
                        content: { "text/plain": { schema: { type: "string", example: "ok" } } },
                    },
                },
            },
        },
        "/auth/register": {
            post: {
                tags: ["Auth"],
                summary: "Registra um novo cliente (role CLIENTE)",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": { schema: { $ref: "#/components/schemas/RegisterInput" } },
                    },
                },
                responses: {
                    "201": {
                        description: "Cliente criado",
                        content: {
                            "application/json": { schema: { $ref: "#/components/schemas/Customer" } },
                        },
                    },
                    "400": { description: "Email ou CPF ja cadastrado", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                    "429": { description: "Limite de cadastros por hora excedido", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                },
            },
        },
        "/auth/login": {
            post: {
                tags: ["Auth"],
                summary: "Autentica e retorna um token JWT",
                description: "Limitado a 5 tentativas mal-sucedidas por 15 minutos.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": { schema: { $ref: "#/components/schemas/LoginInput" } },
                    },
                },
                responses: {
                    "200": {
                        description: "Autenticado",
                        content: {
                            "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
                        },
                    },
                    "401": { description: "Credenciais invalidas", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                    "429": { description: "Muitas tentativas de login", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                },
            },
        },
        "/auth/change-password": {
            post: {
                tags: ["Auth"],
                summary: "Troca a senha do cliente autenticado",
                description: "O dono vem do token, nunca do corpo. Desliga a marca de senha temporaria.",
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["senhaAtual", "novaSenha"],
                                properties: {
                                    currentPassword: { type: "string", example: "Tmp7kQx2pR" },
                                    newPassword: { type: "string", minLength: 6, example: "novasenha123" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Senha alterada", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    "400": { description: "Senha atual incorreta ou nova senha igual a atual", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
        },
        "/auth/profile": {
            get: {
                tags: ["Auth"],
                summary: "Retorna os dados do token do usuario autenticado",
                security: bearerAuth,
                responses: {
                    "200": { description: "Dados do usuario autenticado" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
        "/auth/admin": {
            get: {
                tags: ["Auth"],
                summary: "Rota de exemplo restrita a ADMIN",
                security: bearerAuth,
                responses: {
                    "200": { description: "Area administrativa" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                },
            },
        },
        "/customers": {
            get: {
                tags: ["Clientes"],
                summary: "Lista clientes (paginado)",
                security: bearerAuth,
                description: "Sem o parametro status, lista apenas os clientes ATIVOS.",
                parameters: [
                    { $ref: "#/components/parameters/PageParam" },
                    { $ref: "#/components/parameters/LimitParam" },
                    {
                        name: "status",
                        in: "query",
                        description: "Filtra por status. ALL traz o cadastro inteiro. Ausente ou invalido = ACTIVE.",
                        schema: { type: "string", enum: ["ACTIVE", "INACTIVE", "ANONYMIZED", "ALL"] },
                    },
                ],
                responses: {
                    "200": {
                        description: "Lista paginada de clientes",
                        content: { "application/json": { schema: paginatedResponse("#/components/schemas/Customer") } },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                },
            },
        },
        "/customers/{id}": {
            parameters: [{ $ref: "#/components/parameters/IdPath" }],
            get: {
                tags: ["Clientes"],
                summary: "Obtem um cliente por id",
                security: bearerAuth,
                responses: {
                    "200": { description: "Cliente", content: { "application/json": { schema: { $ref: "#/components/schemas/Customer" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
            put: {
                tags: ["Clientes"],
                summary: "Atualiza um cliente (parcial)",
                description: "Aceita apenas os campos que mudaram. Nao altera email, senha nem role.",
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/CustomerInput" } } },
                },
                responses: {
                    "200": { description: "Cliente atualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Customer" } } } },
                    "400": { description: "Erro de negocio", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
            delete: {
                tags: ["Clientes"],
                summary: "Desativa um cliente",
                description:
                    "Nao apaga o cadastro: marca status INATIVO. O cliente para de conseguir logar e sai da listagem " +
                    "padrao, mas os pedidos dele continuam de pe — a FK de pedidos e carrinhos e ON DELETE CASCADE, e " +
                    "o historico e dado fiscal. Reversivel por POST /clientes/{id}/reativar.",
                security: bearerAuth,
                responses: {
                    "204": { description: "Desativado" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                },
            },
        },
        "/customers/{id}/reset-password": {
            parameters: [{ $ref: "#/components/parameters/IdPath" }],
            post: {
                tags: ["Clientes"],
                summary: "Gera uma senha temporaria para o cliente (ADMIN)",
                description:
                    "Para o lojista atender quem esqueceu a senha. A senha em texto puro so existe nesta resposta — " +
                    "nao e gravada em lugar nenhum e nao ha como consulta-la depois. A conta fica marcada com " +
                    "senhaTemporaria ate o cliente trocar por uma sua.",
                security: bearerAuth,
                responses: {
                    "200": {
                        description: "Senha temporaria gerada",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        temporaryPassword: { type: "string", example: "Tmp7kQx2pR" },
                                    },
                                },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
        },
        "/customers/{id}/reactivate": {
            parameters: [{ $ref: "#/components/parameters/IdPath" }],
            post: {
                tags: ["Clientes"],
                summary: "Reativa um cliente desativado (ADMIN)",
                description: "Volta o status para ATIVO. Cliente ANONIMIZADO nao pode ser reativado.",
                security: bearerAuth,
                responses: {
                    "200": { description: "Cliente reativado", content: { "application/json": { schema: { $ref: "#/components/schemas/Customer" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
        },
        "/products": {
            get: {
                tags: ["Produtos"],
                summary: "Lista produtos (paginado, publico)",
                description:
                    "Sem filtros, traz tudo — inclusive inativos, porque o admin lista por aqui e precisa " +
                    "ver o que desativou para poder reativar. O catalogo do cliente usa `available=true`.",
                parameters: [
                    { $ref: "#/components/parameters/PageParam" },
                    { $ref: "#/components/parameters/LimitParam" },
                    {
                        name: "q",
                        in: "query",
                        description: "Busca por trecho do nome ou da descricao, sem diferenciar maiusculas.",
                        schema: { type: "string" },
                    },
                    {
                        name: "categoriaId",
                        in: "query",
                        schema: { type: "integer", minimum: 1 },
                    },
                    {
                        name: "ativo",
                        in: "query",
                        description: "Filtra so pelo interruptor do produto. Ignora a categoria.",
                        schema: { type: "string", enum: ["true", "false"] },
                    },
                    {
                        name: "available",
                        in: "query",
                        description:
                            "So o que pode ser vendido: produto ativo e categoria ativa (ou sem categoria). " +
                            "E a mesma regra que o carrinho e o fechamento do pedido aplicam.",
                        schema: { type: "string", enum: ["true"] },
                    },
                    {
                        name: "withoutImage",
                        in: "query",
                        description: "So produtos sem foto. Usado pelo admin para saber o que falta fotografar.",
                        schema: { type: "string", enum: ["true"] },
                    },
                ],
                responses: {
                    "200": {
                        description: "Lista paginada de produtos",
                        content: { "application/json": { schema: paginatedResponse("#/components/schemas/Product") } },
                    },
                },
            },
            post: {
                tags: ["Produtos"],
                summary: "Cria um produto",
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/ProductInput" } } },
                },
                responses: {
                    "201": { description: "Produto criado", content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } } },
                    "400": { description: "Erro de validacao de negocio", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
        },
        "/products/{id}": {
            parameters: [{ $ref: "#/components/parameters/IdPath" }],
            get: {
                tags: ["Produtos"],
                summary: "Obtem um produto por id (publico)",
                responses: {
                    "200": { description: "Produto", content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } } },
                    "404": { $ref: "#/components/responses/NotFound" },
                },
            },
            put: {
                tags: ["Produtos"],
                summary: "Atualiza um produto",
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/ProductInput" } } },
                },
                responses: {
                    "200": { description: "Produto atualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
            delete: {
                tags: ["Produtos"],
                summary: "Remove um produto",
                security: bearerAuth,
                responses: {
                    "204": { description: "Desativado" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                },
            },
        },
        "/products/{id}/image": {
            parameters: [{ $ref: "#/components/parameters/IdPath" }],
            put: {
                tags: ["Produtos"],
                summary: "Define a foto do produto (ADMIN)",
                description:
                    "Recebe a foto ja preparada no navegador, em dois tamanhos JPEG quadrados: `grande` " +
                    "(400 a 1200 px, ate 600 KB) e `miniatura` (100 a 320 px, ate 100 KB). Grava no R2 com " +
                    "chave nova a cada envio e apaga os arquivos da foto anterior.",
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                required: ["grande", "miniatura"],
                                properties: {
                                    grande: { type: "string", format: "binary" },
                                    miniatura: { type: "string", format: "binary" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Produto com a foto nova", content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "422": { description: "Arquivo ausente, nao JPEG, nao quadrado ou fora dos limites" },
                    "502": { description: "O armazenamento recusou a gravacao" },
                    "503": { description: "Armazenamento de fotos nao configurado neste ambiente" },
                },
            },
            delete: {
                tags: ["Produtos"],
                summary: "Remove a foto do produto (ADMIN)",
                security: bearerAuth,
                responses: {
                    "200": { description: "Produto sem foto", content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                },
            },
        },
        "/cart": {
            get: {
                tags: ["Carrinho"],
                summary: "Busca o carrinho do cliente autenticado",
                security: bearerAuth,
                responses: {
                    "200": { description: "Carrinho do cliente" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                },
            },
        },
        "/cart/add": {
            post: {
                tags: ["Carrinho"],
                summary: "Adiciona um produto ao carrinho",
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/CartItemInput" } } },
                },
                responses: {
                    "201": { description: "Item adicionado", content: { "application/json": { schema: { $ref: "#/components/schemas/OrderItem" } } } },
                    "400": { description: "Erro de negocio (ex: estoque)", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
        },
        "/cart/item/{itemId}": {
            delete: {
                tags: ["Carrinho"],
                summary: "Remove um item do carrinho",
                security: bearerAuth,
                parameters: [
                    { name: "itemId", in: "path", required: true, schema: { type: "integer", minimum: 1 } },
                ],
                responses: {
                    "200": { description: "Item removido" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
        },
        "/cart/clear": {
            delete: {
                tags: ["Carrinho"],
                summary: "Esvazia o carrinho do cliente",
                security: bearerAuth,
                responses: {
                    "200": { description: "Carrinho esvaziado" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                },
            },
        },
        "/orders": {
            get: {
                tags: ["Pedidos"],
                summary: "Lista todos os pedidos (paginado, ADMIN)",
                security: bearerAuth,
                parameters: [
                    { $ref: "#/components/parameters/PageParam" },
                    { $ref: "#/components/parameters/LimitParam" },
                    {
                        name: "status",
                        in: "query",
                        required: false,
                        description: "Filtra por status do pedido (opcional). Valor fora do enum responde 422.",
                        schema: {
                            type: "string",
                            enum: ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
                        },
                    },
                    {
                        name: "clienteId",
                        in: "query",
                        required: false,
                        description: "Filtra os pedidos de um cliente especifico (opcional).",
                        schema: { type: "integer", minimum: 1 },
                    },
                ],
                responses: {
                    "200": {
                        description: "Lista paginada de pedidos",
                        content: { "application/json": { schema: paginatedResponse("#/components/schemas/Order") } },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                },
            },
        },
        "/orders/my-orders": {
            get: {
                tags: ["Pedidos"],
                summary: "Lista os pedidos do cliente autenticado (paginado)",
                security: bearerAuth,
                parameters: [
                    { $ref: "#/components/parameters/PageParam" },
                    { $ref: "#/components/parameters/LimitParam" },
                ],
                responses: {
                    "200": {
                        description: "Lista paginada de pedidos do cliente",
                        content: { "application/json": { schema: paginatedResponse("#/components/schemas/Order") } },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
        "/orders/checkout": {
            post: {
                tags: ["Pedidos"],
                summary: "Finaliza o carrinho em um pedido (transacional, baixa estoque)",
                security: bearerAuth,
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    invoiceCpf: {
                                        type: "string",
                                        nullable: true,
                                        pattern: "^\\d{11}$",
                                        description: "Opcional. CPF na nota desta venda; nao altera o cadastro do cliente.",
                                        example: "12345678901",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "201": { description: "Pedido criado", content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } } },
                    "400": { description: "Carrinho vazio/estoque insuficiente", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
        },
        "/orders/{pedidoId}": {
            get: {
                tags: ["Pedidos"],
                summary: "Obtem um pedido por id (ADMIN)",
                security: bearerAuth,
                parameters: [
                    { name: "pedidoId", in: "path", required: true, schema: { type: "integer", minimum: 1 } },
                ],
                responses: {
                    "200": { description: "Pedido", content: { "application/json": { schema: { $ref: "#/components/schemas/OrderDetail" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
        },
        "/orders/{pedidoId}/status": {
            patch: {
                tags: ["Pedidos"],
                summary: "Atualiza o status de um pedido (ADMIN)",
                security: bearerAuth,
                parameters: [
                    { name: "pedidoId", in: "path", required: true, schema: { type: "integer", minimum: 1 } },
                ],
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/StatusUpdateInput" } } },
                },
                responses: {
                    "200": { description: "Status atualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } } },
                    "400": { description: "Status invalido", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
        },
    },
};
