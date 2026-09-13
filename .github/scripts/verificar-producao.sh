#!/usr/bin/env bash
# Confere se a loja responde de ponta a ponta: o site, a API e o banco por tras
# dela. Usado pelo workflow Monitor (varias vezes ao dia) e depois de cada deploy.
#
# Sai com erro se qualquer uma das tres falhar; o GitHub manda e-mail de rodada
# com falha, e e esse o aviso.
set -uo pipefail

SITE="${SITE_URL:-https://jacobsbeer.com.br}"
# A API dorme depois de 30 min sem acesso e leva uns 7 s para acordar; e logo apos
# um deploy o container novo ainda esta subindo. Por isso insiste antes de acusar.
TENTATIVAS="${TENTATIVAS:-6}"
ESPERA="${ESPERA:-10}"

falhas=()

checar() {
  local nome=$1 url=$2 padrao=$3
  local resposta codigo corpo
  for tentativa in $(seq 1 "$TENTATIVAS"); do
    resposta=$(curl -s -m 30 -w $'\n%{http_code}' "$url" || true)
    codigo=${resposta##*$'\n'}
    corpo=${resposta%$'\n'*}
    if [ "$codigo" = "200" ] && grep -qE "$padrao" <<<"$corpo"; then
      echo "ok     $nome (tentativa $tentativa)"
      return 0
    fi
    [ "$tentativa" -lt "$TENTATIVAS" ] && sleep "$ESPERA"
  done
  echo "::error::$nome fora do ar: HTTP ${codigo:-sem resposta} em $url"
  falhas+=("$nome")
}

checar "site"  "$SITE/"                                   'Jacob'
checar "api"   "$SITE/api/ping"                           '^ok$'
# O banco: a listagem so volta com total > 0 se a API conseguiu consultar o Neon.
# Pega o banco suspenso por fim das horas do plano gratis, que deixa site e ping de pe.
checar "banco" "$SITE/api/produtos?limit=1&disponivel=true" '"total":[1-9]'

if [ "${#falhas[@]}" -gt 0 ]; then
  echo "Falhou: ${falhas[*]}"
  exit 1
fi
echo "Loja no ar: site, API e banco respondendo."
