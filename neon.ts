import { defineConfig } from "@neon/config/v1";

// Configuracao do projeto Neon (banco da API). Vazia de proposito: do Neon so se
// usa o Postgres, e login, funcoes e arquivos ficam na API e na Cloudflare.
// Ver cloudflare/README.md.
//
// Para aplicar mudancas: `neon config plan` e depois `neon deploy --no-env-pull`.
// SEM o --no-env-pull o deploy grava o DATABASE_URL do Neon por cima do .env local,
// e `npm run dev`, `db:migrate` e `db:seed` passam a mexer no banco de producao.
export default defineConfig({});
