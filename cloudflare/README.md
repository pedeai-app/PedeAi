# API na Cloudflare

A API roda na Cloudflare com a **mesma imagem** do `Dockerfile` da raiz, e o banco é
um Postgres no **Neon** (região AWS São Paulo).

```
navegador ─► pedeai-web (Worker do site, repo frontend-cliente)
               │  /api/* sem o prefixo, por service binding
               ▼
             pedeai-api (este Worker) ─► ApiContainer (Durable Object)
                                            │
                                            ▼
                                   container: node dist/server.js ─► Neon
```

- `pedeai-api` **não tem endereço público** (`workers_dev: false`, sem rota). Só o site
  chega nele.
- Um container só (`max_instances: 1`), do tipo `basic`, fixado na América do Sul. Dorme
  após 30 min sem acesso; o acesso seguinte espera ~5 s ele subir.
- As migrations **não** rodam na partida do container: rodam no deploy
  (`.github/workflows/deploy.yml`).

O `docker compose` + túnel continua funcionando como antes (`deploy.sh` no workspace).

## Configuração única

Siga na ordem. A API precisa existir antes do site, porque o site aponta para ela.

### 1. Neon

Projeto `jacobsbeer` (`crimson-night-72807601`), região **AWS South America (São
Paulo)**, **Postgres 18** — o compose e o CI usam o 17, e um dump do 17 restaura num 18
sem problema. Use a connection string **direta** — sem `-pooler` no host — com
`?sslmode=require` no final. A API lê o `sslmode` da URL sozinha; o `sequelize-cli` das
migrations descarta os parâmetros da URL, e por isso `config/config.js` liga o SSL
quando a URL pede.

O projeto está ligado a esta pasta (`.neon`, fora do git) e declarado em `neon.ts`.
Para aplicar mudança nele, use sempre `neon deploy --no-env-pull`: sem a flag, o
comando grava o `DATABASE_URL` do Neon **por cima do `.env` local**, e os comandos de
desenvolvimento passam a apontar para produção.

### 2. Copiar os dados atuais para o Neon

Com a pilha do compose de pé, na raiz do workspace:

```bash
MSYS_NO_PATHCONV=1 docker exec pedeai-postgres pg_dump -U pedeai -d pedeai -Fc -f /tmp/pedeai.dump
MSYS_NO_PATHCONV=1 docker cp pedeai-postgres:/tmp/pedeai.dump ./pedeai.dump
# pg_restore da versao do servidor de destino (18), que le o dump do 17
MSYS_NO_PATHCONV=1 docker run --rm -v "$PWD:/dump" postgres:18-alpine \
  pg_restore --no-owner --no-acl -d "<URL do Neon>" /dump/pedeai.dump
```

O dump leva a tabela `SequelizeMeta`, então o Neon já sai sabendo quais migrations
foram aplicadas. **Apague o `pedeai.dump` depois**: ele tem cadastro de cliente.

### 3. Primeiro deploy (manual)

Docker Desktop ligado. Nesta pasta:

```bash
npm ci
npx wrangler login
npx wrangler deploy
npx wrangler secret put DATABASE_URL   # a URL do Neon
npx wrangler secret put JWT_SECRET     # pode repetir o do .env atual: ninguém é deslogado
```

O primeiro deploy demora (build e envio da imagem), e a Cloudflare leva alguns minutos
para provisionar o container. Os segredos entram depois do deploy de propósito: o
Worker precisa existir, e sem endereço público ninguém chama a API nesse meio-tempo.

Depois, publique o site: `cloudflare/README.md` do `frontend-cliente`.

### 4. Deploy automático

Em **Settings › Secrets and variables › Actions** deste repositório:

| Tipo | Nome | Valor |
|---|---|---|
| Secret | `DATABASE_URL` | a mesma URL do Neon (usada para as migrations) |
| Secret | `CLOUDFLARE_API_TOKEN` | token com o modelo **Edit Cloudflare Workers**, só nesta conta |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | ID da conta Cloudflare |
| Variable | `DEPLOY_AUTOMATICO` | `true` |

Sem a variável, o workflow de deploy é pulado. Se o passo de publicar reclamar de
permissão no container, acrescente ao token a permissão de **Containers** (edição).

## Dia a dia

```bash
npm run logs     # logs do Worker e do container ao vivo
npm run tipos    # checagem de tipos do Worker
```

## Onde mexer

| Quero | Arquivo |
|---|---|
| Menos espera no primeiro acesso (custa mais) | `sleepAfter` em `src/index.ts` |
| Mais CPU/memória | `instance_type` em `wrangler.jsonc` |
| Nova variável de ambiente para a API | `vars` (ou `wrangler secret put`) **e** `envVars` em `src/index.ts` |

## Pontos de atenção

- **Deploy troca o único container:** a API fica alguns segundos fora durante a troca.
- **Latência:** o Durable Object que controla o container é criado no leste dos EUA (a
  Cloudflare não cria Durable Objects na América do Sul). O container e o banco ficam
  no Brasil, mas cada requisição passa pelo Durable Object. Medir no teste.
- **Horas do Neon grátis:** 100 CU-horas/mês ≈ 400 h de banco ligado. Estourou, o
  banco para até o mês seguinte. Acompanhe no painel do Neon.
