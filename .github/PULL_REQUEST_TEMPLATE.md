## O que muda

<!-- Descreva em uma ou duas frases o que este PR entrega. -->

## Por que

<!-- Contexto: qual problema resolve ou qual necessidade atende. Se houver issue, referencie com "Closes #123". -->

## Como testar

<!-- Passos para validar localmente. Inclua rotas, payloads ou comandos quando fizer sentido. -->

1.
2.

## Checklist

- [ ] `npm test` passa
- [ ] `npx tsc --noEmit` sem erros
- [ ] Migrations novas rodam e têm `down` funcional (`npm run db:migrate:undo`)
- [ ] Endpoints novos ou alterados estão documentados no OpenAPI/Swagger
- [ ] Validators cobrem as entradas novas
- [ ] Nenhum segredo, credencial ou `.env` foi commitado

## Notas para quem revisa

<!-- Pontos de atenção, decisões em aberto, trade-offs assumidos. Opcional. -->
