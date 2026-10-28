# Design Patterns em TypeScript

Um padrão por dia, implementado em TypeScript, seguindo o livro **Padrões de
Projeto: soluções reutilizáveis de software orientado a objetos** (Gamma, Helm,
Johnson e Vlissides, a "Gangue dos Quatro").

## Rodando

Não há Node no host: tudo roda no container `node:24-alpine` do
`docker-compose.yml`. No Git Bash, prefixe os comandos com `MSYS_NO_PATHCONV=1`.

```bash
docker compose run --rm node npm ci                              # instala dependências
docker compose run --rm node npm run demo -- <padrao>            # executa o exemplo de um padrão
docker compose run --rm node npm test                            # testes de todos os padrões
docker compose run --rm node npm run typecheck                   # tsc em modo strict
```

### Testando cada padrão

Prefixe cada comando com `docker compose run --rm node`.

| Padrão | Demo | Testes | O que os testes provam |
|---|---|---|---|
| [Abstract Factory](src/creational/abstract-factory/) | `npm run demo -- abstract-factory` | `node --test src/creational/abstract-factory/abstract-factory.test.ts` | todos os produtos de uma fábrica são da mesma família (AWS ou Azure); o client publica só com a família injetada |
| [Builder](src/creational/builder/) | `npm run demo -- builder` | `node --test src/creational/builder/builder.test.ts` | os mesmos passos do Director geram um `Request` e um comando curl equivalentes; parâmetros opcionais; escape de aspas no curl; passo fora de ordem falha cedo |
| [Factory Method](src/creational/factory-method/) | `npm run demo -- factory-method` | `node --test src/creational/factory-method/factory-method.test.ts` | o mesmo `receive()` aceita cada provedor (Stripe, GitHub) com o verificador criado pela subclasse e rejeita o formato do outro; subclasse nova estende sem mudar o Creator; corpo adulterado, segredo errado e replay são rejeitados |

O Node 24 executa `.ts` direto (_type stripping_), então não há build nem
dependência de runtime: o TypeScript só faz a checagem de tipos, e os testes
usam o `node:test` nativo. Por isso o código usa apenas sintaxe apagável
(`erasableSyntaxOnly`): nada de `enum` nem _parameter properties_.

## Estrutura

```
src/<categoria>/<padrao>/
  README.md          intenção, participantes, consequências, notas de TS
  main.ts            demo executável (npm run demo -- <padrao>)
  <padrao>.test.ts   testes que provam a propriedade central do padrão
  ...                participantes do padrão, um conceito por arquivo
templates/pattern/   modelo do README de cada dia
```

Convenções: código em inglês, documentação em pt-BR, arquivos em kebab-case.

## Roteiro

A ordem segue o catálogo do livro.

### Criação

| Dia | Padrão | Status |
|---|---|---|
| 01 | [Abstract Factory](src/creational/abstract-factory/) | ✅ |
| 02 | [Builder](src/creational/builder/) | ✅ |
| 03 | [Factory Method](src/creational/factory-method/) | ✅ |
| 04 | Prototype | ⏳ |
| 05 | Singleton | ⏳ |

### Estruturais

| Dia | Padrão | Status |
|---|---|---|
| 06 | Adapter | ⏳ |
| 07 | Bridge | ⏳ |
| 08 | Composite | ⏳ |
| 09 | Decorator | ⏳ |
| 10 | Facade | ⏳ |
| 11 | Flyweight | ⏳ |
| 12 | Proxy | ⏳ |

### Comportamentais

| Dia | Padrão | Status |
|---|---|---|
| 13 | Chain of Responsibility | ⏳ |
| 14 | Command | ⏳ |
| 15 | Interpreter | ⏳ |
| 16 | Iterator | ⏳ |
| 17 | Mediator | ⏳ |
| 18 | Memento | ⏳ |
| 19 | Observer | ⏳ |
| 20 | State | ⏳ |
| 21 | Strategy | ⏳ |
| 22 | Template Method | ⏳ |
| 23 | Visitor | ⏳ |

## Adicionando o padrão do dia

1. Crie `src/<categoria>/<padrao>/` (`creational`, `structural` ou `behavioral`).
2. Copie `templates/pattern/README.md` para a pasta e preencha.
3. Implemente os participantes, um `main.ts` e um `<padrao>.test.ts`.
4. Rode `typecheck` e `test`, e marque ✅ no roteiro acima.
5. Adicione o padrão à tabela [Testando cada padrão](#testando-cada-padrão), com os comandos de demo e de teste e o que os testes provam.
