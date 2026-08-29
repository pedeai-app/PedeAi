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
            Cliente: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    nome: { type: "string", example: "Maria Silva" },
                    cpf: { type: "string", example: "12345678901" },
                    telefone: { type: "string", example: "11999998888" },
                    endereco: { type: "string", example: "Rua A, 100" },
                    email: { type: "string", example: "maria@email.com" },
                    role: { type: "string", enum: ["ADMIN", "CLIENTE"], example: "CLIENTE" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            ClienteInput: {
                type: "object",
                required: ["nome", "cpf", "telefone", "endereco"],
                properties: {
                    nome: { type: "string", minLength: 3, maxLength: 150, example: "Maria Silva" },
                    cpf: { type: "string", pattern: "^\\d{11}$", example: "12345678901" },
                    telefone: { type: "string", pattern: "^\\d{10,11}$", example: "11999998888" },
                    endereco: { type: "string", example: "Rua A, 100" },
                },
            },
            Produto: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    nome: { type: "string", example: "X-Burger" },
                    descricao: { type: "string", nullable: true, example: "Hamburguer artesanal" },
                    preco: { type: "string", example: "25.90" },
                    estoque: { type: "integer", example: 50 },
                    imagemUrl: { type: "string", nullable: true, example: "https://cdn/x.png" },
                    ativo: { type: "boolean", example: true },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            ProdutoInput: {
                type: "object",
                required: ["nome", "preco"],
                properties: {
                    nome: { type: "string", minLength: 2, maxLength: 255, example: "X-Burger" },
                    descricao: { type: "string", example: "Hamburguer artesanal" },
                    preco: { type: "number", format: "float", minimum: 0, example: 25.9 },
                    estoque: { type: "integer", minimum: 0, example: 50 },
                    imagemUrl: { type: "string", format: "uri", example: "https://cdn/x.png" },
                    ativo: { type: "boolean", example: true },
                },
            },
            ItemPedido: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    pedidoId: { type: "integer", example: 1 },
                    produtoId: { type: "integer", example: 1 },
                    quantidade: { type: "integer", example: 2 },
                    precoUnitario: { type: "string", example: "25.90" },
                    produto: { $ref: "#/components/schemas/Produto" },
                },
            },
            // Dados do cliente embutidos no pedido. Sao dois recortes distintos:
            // a listagem ADMIN expoe o minimo para identificar quem comprou, e o
            // detalhe acrescenta o contato necessario para a entrega. O CPF nunca
            // e exposto em nenhum dos dois.
            ClienteResumo: {
                type: "object",
                description: "Identificacao do cliente dono do pedido (listagem ADMIN).",
                properties: {
                    id: { type: "integer", example: 1 },
                    nome: { type: "string", example: "Maria Silva" },
                    email: { type: "string", example: "maria@email.com" },
                },
            },
            ClienteEntrega: {
                type: "object",
                description: "Cliente com os dados de contato/entrega (detalhe do pedido, ADMIN).",
                properties: {
                    id: { type: "integer", example: 1 },
                    nome: { type: "string", example: "Maria Silva" },
                    email: { type: "string", example: "maria@email.com" },
                    telefone: { type: "string", example: "11999998888" },
                    endereco: { type: "string", example: "Rua A, 100" },
                },
            },
            Pedido: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    clienteId: { type: "integer", example: 1 },
                    status: {
                        type: "string",
                        enum: [
                            "PENDENTE",
                            "CONFIRMADO",
                            "EM_PREPARO",
                            "SAIU_PARA_ENTREGA",
                            "ENTREGUE",
                            "CANCELADO",
                        ],
                        example: "PENDENTE",
                    },
                    valorTotal: { type: "string", example: "51.80" },
                    cliente: { $ref: "#/components/schemas/ClienteResumo" },
                    itens: { type: "array", items: { $ref: "#/components/schemas/ItemPedido" } },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            PedidoDetalhe: {
                allOf: [
                    { $ref: "#/components/schemas/Pedido" },
                    {
                        type: "object",
                        properties: {
                            cliente: { $ref: "#/components/schemas/ClienteEntrega" },
                        },
                    },
                ],
            },
            RegisterInput: {
                type: "object",
                required: ["nome", "cpf", "telefone", "endereco", "email", "senha"],
                properties: {
                    nome: { type: "string", minLength: 3, maxLength: 150, example: "Maria Silva" },
                    cpf: { type: "string", pattern: "^\\d{11}$", example: "12345678901" },
                    telefone: { type: "string", pattern: "^\\d{10,11}$", example: "11999998888" },
                    endereco: { type: "string", example: "Rua A, 100" },
                    email: { type: "string", format: "email", example: "maria@email.com" },
                    senha: { type: "string", minLength: 6, example: "senha123" },
                },
            },
            LoginInput: {
                type: "object",
                required: ["email", "senha"],
                properties: {
                    email: { type: "string", format: "email", example: "admin@pedeai.com" },
                    senha: { type: "string", example: "senha123" },
                },
            },
            AuthResponse: {
                type: "object",
                properties: {
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsIn..." },
                    cliente: {
                        type: "object",
                        properties: {
                            id: { type: "integer", example: 1 },
                            nome: { type: "string", example: "Admin" },
                            email: { type: "string", example: "admin@pedeai.com" },
                            role: { type: "string", example: "ADMIN" },
                        },
                    },
                },
            },
            CarrinhoItemInput: {
                type: "object",
                required: ["produtoId", "quantidade"],
                properties: {
                    produtoId: { type: "integer", minimum: 1, example: 1 },
                    quantidade: { type: "integer", minimum: 1, example: 2 },
                },
            },
            StatusUpdateInput: {
                type: "object",
                required: ["status"],
                properties: {
                    status: {
                        type: "string",
                        enum: [
                            "PENDENTE",
                            "CONFIRMADO",
                            "EM_PREPARO",
                            "SAIU_PARA_ENTREGA",
                            "ENTREGUE",
                            "CANCELADO",
                        ],
                        example: "CONFIRMADO",
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
                            "application/json": { schema: { $ref: "#/components/schemas/Cliente" } },
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
        "/clientes": {
            get: {
                tags: ["Clientes"],
                summary: "Lista clientes (paginado)",
                security: bearerAuth,
                parameters: [
                    { $ref: "#/components/parameters/PageParam" },
                    { $ref: "#/components/parameters/LimitParam" },
                ],
                responses: {
                    "200": {
                        description: "Lista paginada de clientes",
                        content: { "application/json": { schema: paginatedResponse("#/components/schemas/Cliente") } },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                },
            },
            post: {
                tags: ["Clientes"],
                summary: "Cria um cliente",
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/ClienteInput" } } },
                },
                responses: {
                    "201": { description: "Cliente criado", content: { "application/json": { schema: { $ref: "#/components/schemas/Cliente" } } } },
                    "400": { description: "CPF ja existe", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
        },
        "/clientes/{id}": {
            parameters: [{ $ref: "#/components/parameters/IdPath" }],
            get: {
                tags: ["Clientes"],
                summary: "Obtem um cliente por id",
                security: bearerAuth,
                responses: {
                    "200": { description: "Cliente", content: { "application/json": { schema: { $ref: "#/components/schemas/Cliente" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
            put: {
                tags: ["Clientes"],
                summary: "Atualiza um cliente",
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/ClienteInput" } } },
                },
                responses: {
                    "200": { description: "Cliente atualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Cliente" } } } },
                    "400": { description: "Erro de negocio", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
            delete: {
                tags: ["Clientes"],
                summary: "Remove um cliente",
                security: bearerAuth,
                responses: {
                    "204": { description: "Removido" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                },
            },
        },
        "/produtos": {
            get: {
                tags: ["Produtos"],
                summary: "Lista produtos (paginado, publico)",
                parameters: [
                    { $ref: "#/components/parameters/PageParam" },
                    { $ref: "#/components/parameters/LimitParam" },
                ],
                responses: {
                    "200": {
                        description: "Lista paginada de produtos",
                        content: { "application/json": { schema: paginatedResponse("#/components/schemas/Produto") } },
                    },
                },
            },
            post: {
                tags: ["Produtos"],
                summary: "Cria um produto",
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/ProdutoInput" } } },
                },
                responses: {
                    "201": { description: "Produto criado", content: { "application/json": { schema: { $ref: "#/components/schemas/Produto" } } } },
                    "400": { description: "Erro de validacao de negocio", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
        },
        "/produtos/{id}": {
            parameters: [{ $ref: "#/components/parameters/IdPath" }],
            get: {
                tags: ["Produtos"],
                summary: "Obtem um produto por id (publico)",
                responses: {
                    "200": { description: "Produto", content: { "application/json": { schema: { $ref: "#/components/schemas/Produto" } } } },
                    "404": { $ref: "#/components/responses/NotFound" },
                },
            },
            put: {
                tags: ["Produtos"],
                summary: "Atualiza um produto",
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/ProdutoInput" } } },
                },
                responses: {
                    "200": { description: "Produto atualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Produto" } } } },
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
                    "204": { description: "Removido" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                },
            },
        },
        "/carrinho": {
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
        "/carrinho/adicionar": {
            post: {
                tags: ["Carrinho"],
                summary: "Adiciona um produto ao carrinho",
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/CarrinhoItemInput" } } },
                },
                responses: {
                    "201": { description: "Item adicionado", content: { "application/json": { schema: { $ref: "#/components/schemas/ItemPedido" } } } },
                    "400": { description: "Erro de negocio (ex: estoque)", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
        },
        "/carrinho/item/{itemId}": {
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
        "/carrinho/limpar": {
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
        "/pedidos": {
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
                            enum: ["PENDENTE", "CONFIRMADO", "EM_PREPARO", "SAIU_PARA_ENTREGA", "ENTREGUE", "CANCELADO"],
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
                        content: { "application/json": { schema: paginatedResponse("#/components/schemas/Pedido") } },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                },
            },
        },
        "/pedidos/meus-pedidos": {
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
                        content: { "application/json": { schema: paginatedResponse("#/components/schemas/Pedido") } },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
        "/pedidos/finalizar": {
            post: {
                tags: ["Pedidos"],
                summary: "Finaliza o carrinho em um pedido (transacional, baixa estoque)",
                security: bearerAuth,
                responses: {
                    "201": { description: "Pedido criado", content: { "application/json": { schema: { $ref: "#/components/schemas/Pedido" } } } },
                    "400": { description: "Carrinho vazio/estoque insuficiente", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
        "/pedidos/{pedidoId}": {
            get: {
                tags: ["Pedidos"],
                summary: "Obtem um pedido por id (ADMIN)",
                security: bearerAuth,
                parameters: [
                    { name: "pedidoId", in: "path", required: true, schema: { type: "integer", minimum: 1 } },
                ],
                responses: {
                    "200": { description: "Pedido", content: { "application/json": { schema: { $ref: "#/components/schemas/PedidoDetalhe" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
        },
        "/pedidos/{pedidoId}/status": {
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
                    "200": { description: "Status atualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Pedido" } } } },
                    "400": { description: "Status invalido", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "422": { $ref: "#/components/responses/ValidationFailed" },
                },
            },
        },
    },
};
