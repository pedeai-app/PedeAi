# PedeAi — API (backend-express)

API REST do PedeAi (loja Jacobs Beer), consumida pelo app Angular em
`frontend-cliente/`. Sobe em `http://localhost:3000`. Docs OpenAPI em `/docs`.

Fluxo de trabalho Claude + Codex (MCP): ver `CLAUDE.md` da raiz do workspace.

## Stack

- **Express 5** + **TypeScript strict** (CommonJS, `target ES2022`).
- **Sequelize 6** com **sequelize-typescript** (decorators). Banco **PostgreSQL**.
- **JWT** (`jsonwebtoken`) + **bcryptjs**. Validação com **express-validator**.
- `helmet`, `cors`, `express-rate-limit`. Testes com **Jest + supertest**.

## Arquitetura em camadas (OBRIGATÓRIO)

`routes` → `middlewares` → `controller` → `service` → `model`.

- **Controller** cuida **só** de HTTP: lê `req`, chama o service, devolve status +
  JSON. **Nunca** acessa `Model` direto nem monta query.
- **Service** concentra a regra de negócio e todo acesso ao Sequelize. **Nunca**
  recebe `req`/`res` nem devolve status HTTP — sinaliza erro com `throw new Error(...)`.
- **Route** só declara caminho e cadeia de middlewares; sem lógica.

## Convenções de arquivos

Um domínio novo = 5 arquivos, mesmo nome-base:

| Camada | Pasta | Arquivo | Exemplo |
|---|---|---|---|
| Rota | `src/routes/` | `<dominio>Routes.ts` | `produtoRoutes.ts` |
| Controller | `src/controllers/` | `<dominio>Controller.ts` | `produtoController.ts` |
| Service | `src/services/` | `<dominio>Service.ts` | `produtoService.ts` |
| Validator | `src/validators/` | `<dominio>Validator.ts` | `produtoValidator.ts` |
| Model | `src/models/` | `<Modelo>.ts` (PascalCase) | `Produto.ts` |

- Controllers e services são **classes exportadas como singleton**:
  `export default new ProdutoService();`. (`ClienteController` é a exceção legada —
  named export instanciado na rota; **não** copiar esse padrão.)
- Model novo precisa ser registrado no array `models` de `src/config/database.ts`,
  senão o Sequelize não o conhece.
- Rota nova precisa de `app.use('/recurso', recursoRoutes)` em `src/app.ts`.

## Ordem dos middlewares na rota

Sempre nesta ordem: `authMiddleware` → `roleMiddleware('ADMIN')` → `validate(...)` →
controller.

```ts
router.post('/', authMiddleware, roleMiddleware('ADMIN'), validate(criarProdutoValidator), ProdutoController.criarProduto);
```

Quando **toda** a rota é ADMIN, use `router.use(authMiddleware, roleMiddleware('ADMIN'))`
no topo (padrão de `clienteRoutes.ts`).

## Autenticação e autorização

- Payload do JWT é `{ id, role }`; expira em `1d`. `authMiddleware` popula `req.user`.
- O id do dono vem **sempre** de `req.user!.id` — **nunca** aceitar `clienteId` vindo do
  body ou da query. Toda operação de carrinho/pedido do cliente é escopada por ele.
- Roles: `ADMIN` e `CLIENTE` (enum na coluna `role` de `clientes`).
- Senha: `Cliente` tem `defaultScope` que **exclui** `senha`. Só o login usa
  `Cliente.scope('comSenha')`. Hash com `bcrypt.hash(senha, 10)`.

## Validação e erros

- Toda entrada passa por um validator (`body`/`param`) via `validate()`. Falha → **422**
  com `{ message, errors: [{ campo, mensagem }] }`.
- Controller traduz o `throw` do service em status: **400** em criar/atualizar,
  **404** em "não encontrado", **401** em credenciais inválidas.
- `errorHandler` global cobre 500 e JSON malformado; `notFoundHandler` responde 404 em
  rota inexistente. Não duplicar esses casos nos controllers.

## Padrões de dados

- **Paginação**: listagem usa `getPaginationParams(req.query)` +
  `Produto.findAndCountAll({ limit, offset, order: [["id","ASC"]], distinct: true })` +
  `buildPaginatedResult(rows, count, page, limit)` → envelope `{ data, pagination }`.
  `limit` é capado em 100 (`src/utils/pagination.ts`).
- **Mass assignment**: `create`/`update` sempre com allowlist explícita
  (`fields: [...CAMPOS_PERMITIDOS]`), como em `produtoService.ts`.
- **DECIMAL(10,2) volta como string** do pg: `Number(item.precoUnitario)` antes de
  qualquer cálculo (ver `pedidoService.finalizarPedido`).
- **Transação** para toda operação que escreve em mais de uma tabela
  (`sequelize.transaction(async (transaction) => ...)`), passando `transaction` em
  **todas** as chamadas. Baixa de estoque usa `lock: Transaction.LOCK.UPDATE`.
- Filtros de query string são normalizados no controller antes de virar objeto de
  filtro tipado do service (padrão `getProdutoFiltros`).

## Migrations (OBRIGATÓRIO)

O schema é gerenciado **só por migrations** — `sequelize.sync()` não é usado.

- Alterou model? Escreva a migration correspondente. Sem exceção.
- `npm run migration:generate descricao-curta` — **sem** `-- --name`: o script já termina
  em `--name`, e passar de novo faz o yargs juntar os dois num array, gerando arquivo
  com vírgula no nome (`20260829225621-,descricao-curta.js`).
- `down` precisa funcionar de verdade (`npm run db:migrate:undo` faz parte do checklist
  de PR). Migrations são JS puro em `migrations/`, não TS.
- FK nova em tabela existente: `allowNull: true` + `onDelete` explícito, para não
  quebrar linhas já gravadas (ver `20260705000000-create-categoria.js`).

## Swagger

`src/config/swagger.ts` é escrito **à mão** (não gerado por anotações). Endpoint novo ou
alterado exige atualizar a spec no mesmo PR.

## Testes

- `tests/**/*.test.ts`, rodam com `npm test`. `tests/setupEnv.ts` injeta `JWT_SECRET` e
  `DATABASE_URL` de placeholder.
- A suíte atual **não toca o banco**: exercita só middlewares (404, JSON inválido, 401,
  403, 422) via supertest sobre `src/app.ts`, com token assinado na mão.
- Teste que precise de banco real não tem infra hoje — proponha antes de escrever.

## Comandos

```bash
npm run dev              # ts-node-dev com respawn
npm test                 # jest
npx tsc --noEmit         # checagem de tipos (item do checklist de PR)
npm run db:migrate       # aplica migrations
npm run db:migrate:undo  # desfaz a última
npm run db:seed          # cria o ADMIN inicial (exige ADMIN_SENHA no .env)
```

## Docker: cuidado com a porta 3000

O serviço `app` do `docker-compose.yml` tem `restart: unless-stopped` — ele volta sozinho
quando o Docker Desktop inicia e ocupa a 3000 servindo o `dist/` **antigo**. Sintoma:
404 "Rota não encontrada." em endpoint novo enquanto os antigos respondem 200.

Ao ver isso, rode `docker ps` **antes** de depurar o código. Para desenvolver com hot
reload: `docker compose stop app` (mantém o `pedeai-postgres`, que o `.env` local usa via
`localhost:5432`).

## Git

`develop` é a branch de integração; todo trabalho entra por PR (template em
`.github/PULL_REQUEST_TEMPLATE.md`). Nunca commitar `.env` ou segredos — só `.env.example`.
