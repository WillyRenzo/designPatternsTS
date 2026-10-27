# Produtividade e Ferramentas

Windows + Docker Desktop, repositório no GitHub
(`WillyRenzo/designPatternsTS`).

## Docker (o Node não é instalado no host)

```
docker compose run --rm node npm ci                         # instala dependências
docker compose run --rm node npm run demo -- <padrao>       # executa o exemplo
docker compose run --rm node npm test                       # todos os testes
docker compose run --rm node npm run typecheck              # tsc --noEmit
docker compose run --rm node node --test src/creational/abstract-factory/abstract-factory.test.ts
                                                            # testes de um padrão só
```

- No **Git Bash**, prefixe os comandos com `MSYS_NO_PATHCONV=1`; sem isso ele reescreve caminhos como `/app`.
- O container monta a raiz do repositório em `/app`, então `node_modules/` fica no host e é reaproveitado entre execuções.

## Fluxo de um padrão novo

1. Crie `src/<categoria>/<padrao>/` e copie `templates/pattern/README.md`.
2. Implemente os participantes, o `main.ts` e o teste (veja `.claude/rules/patterns.md`).
3. `typecheck`, `test` e `demo -- <padrao>`.
4. Marque ✅ no roteiro do `README.md` raiz e em `study-plan.md`, e adicione o padrão à tabela "Testando cada padrão" do `README.md` raiz.
5. Commits atômicos (`feat(<categoria>/<padrao>): ...`, `docs: ...`) e push.

## Git e GitHub

- A identidade (`WillyRenzo <willyrenzodemelo@hotmail.com>`) está configurada no repositório local, não globalmente.
- `git config core.autocrlf` está ativo no Windows: os avisos "LF will be replaced by CRLF" são esperados e o repositório guarda LF.

```
gh repo view --web               # abre o repositório
gh run view --log-failed         # se um dia houver CI
```

## Claude Code neste projeto

- O hook em `.claude/settings.json` bloqueia `git commit` se o typecheck ou os testes falharem (roda via Docker). Veja `.claude/hooks/README.md`.
- Skills de apoio em `agent_docs/skills/` (code-review, debug-assistant, doc-writer, feature-planner, pr-writer, refactor-guide, test-generator): leia o `SKILL.md` correspondente quando a tarefa pedir.
