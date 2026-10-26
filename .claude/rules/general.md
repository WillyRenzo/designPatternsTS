# Convenções Gerais

- **Idioma:** código (classes, métodos, variáveis, arquivos) em inglês. README, comentários e nomes de testes em pt-BR.
- **Commits:** Conventional Commits e atômicos (uma mudança lógica por commit), com escopo `<categoria>/<padrao>` quando couber, ex.: `feat(creational/builder): implementa montagem de requisições HTTP`, `docs: ...`, `chore(deps): ...`.
- **Branches:** `main` é a linha de estudo; mudanças de infraestrutura maiores podem ir em `chore/<...>`.
- **Nomes:** arquivos em kebab-case (`cloud-provider-factory.ts`), classes e interfaces em PascalCase, funções e variáveis em camelCase. Sem prefixo `I` em interfaces.
- Formatação e ordem de imports não são regra em prosa: se começarem a incomodar, a resposta é adicionar um formatter, não um parágrafo aqui.
