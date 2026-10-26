# Arquitetura

Decisões que sessões futuras não devem desfazer sem conversar. Referências apontam
para o código real.

## Visão geral

```
src/<categoria>/<padrao>/   cada padrão é uma ilha: não importa nada de outro padrão
scripts/demo.ts             localiza e executa src/*/<padrao>/main.ts
templates/pattern/          modelo do README de cada padrão
```

- **Padrões independentes.** Nenhum padrão importa código de outro, mesmo quando o livro os relaciona (ex.: Abstract Factory usa Factory Method). A relação é explicada na seção "Padrões relacionados" do README. Isso mantém cada pasta legível sozinha e permite estudar em qualquer ordem.
- **Sem código compartilhado em `src/`.** Duplicar um tipo pequeno entre dois padrões é aceitável; um `shared/` acoplaria exemplos que devem evoluir separados.

## Runtime sem build

| Decisão | Por quê |
|---|---|
| Node 24 executa `.ts` direto (type stripping) | Sem `tsc` de build, sem `dist/`, sem `tsx`: menos peças para um projeto de estudo. |
| TypeScript só para typecheck (`noEmit`) | O compilador valida; o Node executa. |
| `erasableSyntaxOnly` | Type stripping só remove tipos; `enum`, `namespace` e parameter properties geram código e quebrariam a execução. |
| `node:test` + `node:assert/strict` | Testes sem dependências; o runner nativo cobre o que os exemplos precisam. |
| Docker (`node:24-alpine`) | Não há Node no host; o container é o ambiente único de execução. |

Dependências de desenvolvimento: apenas `typescript` e `@types/node`. Adicionar
qualquer outra precisa de justificativa (veja `security.md` → supply chain).

## Como cada exemplo é montado

- **Cenários de backend, não os do livro.** O livro usa widgets, labirintos e editores de texto; aqui os exemplos usam situações que aparecem no trabalho (provedores de nuvem, pipelines, notificações…), com implementações em memória. A tabela de participantes do README faz a ponte com o livro.
- **Composição na raiz.** `main.ts` é o único lugar que instancia as classes concretas e injeta as dependências. Os participantes recebem abstrações pelo construtor (AFA 01).
- **Encapsulamento com `#private`.** Campos privados reais do JavaScript em vez de `private` do TypeScript, para que o encapsulamento valha em runtime.

## AFAs do Z3t@ neste projeto

| Aplicadas | Como |
|---|---|
| 01 Composable | interfaces como contrato, DI por construtor, composição em `main.ts` |
| 19 Testes | todo padrão tem teste da sua propriedade central |

As demais AFAs tratam de sistemas distribuídos, APIs e dados em produção, e não
se aplicam a exemplos didáticos em memória (YAGNI). O princípio "GoF só quando
necessário" vale para o código de suporte (`scripts/`, testes), não para os
exemplos, onde o padrão é o próprio objeto de estudo.
