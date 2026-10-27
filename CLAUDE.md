# Contexto do Projeto

Projeto de estudos: um padrão GoF por dia, implementado em TypeScript, seguindo o
livro **Padrões de Projeto: soluções reutilizáveis de software orientado a
objetos** (Gamma, Helm, Johnson e Vlissides). A ordem é a do catálogo do livro
(criação → estruturais → comportamentais); o roteiro e o status de cada padrão
estão no `README.md`. O objetivo é didático: cada exemplo deve deixar evidente a
estrutura e os participantes do padrão, não simular um sistema completo.

# Stack

- **Node.js 24 LTS rodando em Docker** (`node:24-alpine`); não há Node no host.
- **TypeScript 7** em modo `strict` (com `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`), usado **só para typecheck**: o Node executa `.ts` direto por type stripping, sem build.
- **Testes:** `node:test` + `node:assert/strict` nativos. Sem dependências de runtime.
- **npm** com `.npmrc` de supply chain (`ignore-scripts`, `min-release-age=3`).

# Comandos

Rode da raiz do repositório. No Git Bash, prefixe com `MSYS_NO_PATHCONV=1`.

```
docker compose run --rm node npm ci                            # instalar dependências
docker compose run --rm node npm run demo -- <padrao>          # executar o main.ts de um padrão
docker compose run --rm node npm test                          # testes de todos os padrões
docker compose run --rm node npm run typecheck                 # tsc --noEmit
```

# Estrutura de Arquivos

```
src/creational/<padrao>/    padrões de criação
src/structural/<padrao>/    padrões estruturais
src/behavioral/<padrao>/    padrões comportamentais
  README.md                 intenção, exemplo, participantes (livro → código), aplicabilidade, consequências, notas de TS, relacionados
  main.ts                   demo executável
  <padrao>.test.ts          testes da propriedade central do padrão
  ...                       um participante/conceito por arquivo
scripts/demo.ts             runner do `npm run demo`
templates/pattern/README.md modelo do README de cada padrão
```

# Regras de Trabalho

- **Só sintaxe apagável** (`erasableSyntaxOnly`): nada de `enum`, `namespace` ou parameter properties; use union de literais e campos declarados. Imports relativos com extensão `.ts` e `import type` para tipos.
- **Cada padrão novo:** pasta na categoria certa, README a partir do template, `main.ts`, teste, e ✅ no roteiro do `README.md` raiz.
- **Instruções de teste são obrigatórias:** todo padrão entra na tabela "Testando cada padrão" do `README.md` raiz (comando de demo, comando de teste do padrão e o que os testes provam), e a seção "Rodando" do README do padrão traz os mesmos comandos.
- **Exemplos próprios, não cópia do livro:** prefira cenários de backend realistas (com implementações em memória) aos exemplos de widgets/labirinto do livro, e mapeie os participantes do livro na tabela do README.
- **Explique o que muda no TypeScript** em relação ao C++/Smalltalk do livro (interface vs. classe abstrata, `#private`, composição na raiz em vez de Singleton etc.).
- Antes de considerar um padrão pronto, rode `typecheck`, `test` e o `demo` dele.
- **Idioma:** código em inglês; README, comentários e mensagens de teste em pt-BR. Arquivos em kebab-case, classes em PascalCase.
- **Commits:** Conventional Commits e atômicos, com escopo `<categoria>/<padrao>` quando couber, ex.: `feat(creational/builder): ...`, `docs: ...`, `chore: ...`.

# Contexto Aprofundado

Leia quando a tarefa pedir:

- Plano de estudo (ideias de exemplo e propriedade a testar por padrão): `agent_docs/study-plan.md`
- Arquitetura e decisões (runtime sem build, padrões independentes): `agent_docs/architecture.md`
- Padrões de engenharia: `agent_docs/engineering-standards.md`
- Segurança (supply chain, repositório público): `agent_docs/security.md`
- Ferramentas, Docker e fluxo de um padrão novo: `agent_docs/productivity.md`
- Persona Z3t@ e AFAs: `agent_docs/z3t@-global-context.md`. Neste projeto, padrões GoF são o próprio objeto de estudo; o princípio "GoF só quando necessário" vale para o código de suporte (scripts, testes), não para os exemplos.
- Convenções de código: `.claude/rules/` (carregam sozinhas pelo caminho do arquivo)
- Skills de apoio (code-review, debug-assistant, doc-writer, feature-planner, pr-writer, refactor-guide, test-generator): `agent_docs/skills/<nome>/SKILL.md`

# Mantendo Este Arquivo Atual

Se durante o trabalho aparecer algo que deveria virar regra permanente (uma
convenção, uma decisão, um erro que não pode se repetir), não aplique em
silêncio: pergunte se deve ser documentado aqui. Se você errar porque faltava
uma regra, diga isso.

# Idioma das Respostas

Always respond in Brazilian Portuguese, regardless of the language used in the prompt.
