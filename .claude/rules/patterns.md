---
paths:
  - "src/**/*.ts"
  - "src/**/README.md"
---
# Implementação dos Padrões

- **Um participante ou conceito por arquivo**, nomeado pelo papel no exemplo (`report-publisher.ts`), não pelo papel no livro (`client.ts`). O mapeamento livro → código fica na tabela de participantes do README.
- **Dependa de interfaces.** O client recebe as abstrações por construtor; classes concretas só são instanciadas na composição (`main.ts`) ou dentro do próprio padrão quando essa é a intenção dele (ex.: fábricas).
- **Esconda o que o padrão esconde:** se o padrão diz que o client não conhece as classes concretas, não as exporte (veja `abstract-factory/families/`).
- **Sintaxe apagável** (`erasableSyntaxOnly`): sem `enum`, `namespace`, parameter properties nem decorators legados. Use union de literais, campos declarados e `#private`.
- Imports relativos com extensão `.ts`; `import type` para tipos (`verbatimModuleSyntax`).
- **Sem I/O real:** implementações em memória e determinísticas. Nada de rede, disco, relógio ou aleatoriedade sem injeção.
- **`main.ts`** é a demo: monta os objetos, mostra o padrão em ação (de preferência comparando duas variações) e imprime algo legível. Não contém lógica do padrão.
- **Testes** (`<padrao>.test.ts`) usam `node:test` + `node:assert/strict` e provam a **propriedade central do padrão** (ex.: produtos da mesma família, undo que restaura o estado), não só o caminho feliz.
- **README** a partir de `templates/pattern/README.md`: a seção "Notas de implementação" explica o que muda em TypeScript em relação ao C++/Smalltalk do livro.
