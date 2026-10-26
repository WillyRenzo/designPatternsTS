# Segurança

Projeto de estudo, sem servidor, sem dados de usuários e sem segredos. A
superfície de ataque real é a cadeia de dependências e o que vai para o
repositório público.

## Supply chain (npm)

- Lockfile commitado; instale sempre com `npm ci`.
- `.npmrc` com `ignore-scripts=true` (nenhum pacote executa script na instalação) e `min-release-age=3` (versões publicadas há menos de 3 dias são recusadas, evitando releases maliciosas que são removidas logo depois).
- Dependências de desenvolvimento só `typescript` e `@types/node`. Antes de adicionar outra, confira manutenção, downloads e se ela é mesmo necessária; quase sempre a API nativa do Node resolve.
- Tudo roda dentro do container `node:24-alpine`, isolado do host.

## Repositório público

- Nunca commite `.env`, tokens ou credenciais, nem em exemplos. Os exemplos usam nomes fictícios (`reports`, `relatorios`) e implementações em memória: nenhum SDK real, nenhuma chave.
- Documentos de outros projetos (ex.: TaNaRegua) não entram aqui; eles descrevem arquitetura e riscos de um sistema real.

## Nos exemplos

Quando um padrão envolver um cenário sensível (ex.: Proxy de proteção, Chain of
Responsibility para autorização), o exemplo deve mostrar a prática correta:
deny by default, checagem de autorização no lado do recurso e nada de segredo
em log.
