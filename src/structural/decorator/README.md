# Decorator

> **Categoria:** estrutural · **Escopo:** objeto · **Dia:** 09 (24/11/2026)

## Intenção

Dinamicamente, agregar responsabilidades adicionais a um objeto. Os decorators
fornecem uma alternativa flexível ao uso de subclasses para extensão de
funcionalidades.

## O exemplo

O código de negócio depende de `ProductRepository` (`findById`, `save`). O
repositório concreto só guarda e busca. Cache, retry com backoff e log são
responsabilidades transversais, e cada uma vira um decorador com a **mesma
interface**, que faz algo antes ou depois de repassar a chamada ao objeto
embrulhado:

```
 client ──► LoggingRepository ──► CachingRepository ──► RetryingRepository ──► InMemoryProductRepository
            registra o pedido     hit? devolve          TransientError?          o "banco"
                                  miss? repassa e guarda  espera e repete
```

Com herança, cada combinação seria uma subclasse (`CachedRetryingLoggedRepository`…):
com 3 responsabilidades opcionais são 7 combinações, sem contar a ordem. Com
decoradores são 3 classes, combinadas na montagem:

```ts
new LoggingRepository(new CachingRepository(new RetryingRepository(db, retry), cache), log);
```

**A ordem importa**, e a demo mostra isso com as mesmas classes em duas pilhas:

| Pilha | O log registra |
|---|---|
| `Logging(Caching(Retrying(db)))` | cada pedido do client, inclusive os resolvidos pelo cache, sem ver as falhas |
| `Caching(Retrying(Logging(db)))` | cada ida ao banco, inclusive as tentativas que falharam, e nada do que o cache resolveu |

O resultado para o client é o mesmo nas duas pilhas (os testes conferem as 6
ordens possíveis); o que muda é o que cada camada observa.

| Participante (livro) | Neste exemplo |
|---|---|
| Component | `ProductRepository` ([product-repository.ts](product-repository.ts)) |
| ConcreteComponent | `InMemoryProductRepository` ([in-memory-product-repository.ts](in-memory-product-repository.ts)) |
| Decorator | `RepositoryDecorator` ([repository-decorator.ts](repository-decorator.ts)) |
| ConcreteDecorator | `CachingRepository` ([caching-repository.ts](caching-repository.ts)), `RetryingRepository` ([retrying-repository.ts](retrying-repository.ts)), `LoggingRepository` ([logging-repository.ts](logging-repository.ts)) |

## Aplicabilidade

Use quando:

- você quer acrescentar responsabilidades a objetos individuais de forma
  dinâmica e transparente, sem afetar outros objetos (um repositório com cache
  e outro sem, na mesma aplicação);
- as responsabilidades podem ser retiradas (basta montar sem o decorador);
- a extensão por subclasses é impraticável pela explosão de combinações, ou
  porque a classe não pode ser herdada.

## Consequências

| | |
|---|---|
| ✅ Mais flexível que herança | Responsabilidades entram e saem na composição, e a mesma pode aparecer duas vezes (um log por fora e outro por dentro). |
| ✅ Classes simples, uma responsabilidade cada | O repositório não sabe de cache; o cache não sabe de retry. Os testes até criam um decorador novo, `CountingRepository`, em 7 linhas. |
| ❌ O decorador não é o componente | Identidade muda: `repo === db` é falso. Quem depende do tipo concreto (`instanceof InMemoryProductRepository`, ou `failNextReads()`) perde o acesso. |
| ❌ Muitos objetos pequenos parecidos | A ordem vira parte da configuração. Montar `Retrying` por fora de `Caching` funciona, mas `Caching` por fora de `Logging` esconde do log as leituras resolvidas pelo cache, e isso só aparece rodando. |
| ❌ Cada decorador decide o que decora | `RetryingRepository` repete leituras, mas não escritas, porque `save` não é garantidamente idempotente. Essa decisão é por método, e quem monta a pilha precisa conhecê-la. |

## Notas de implementação (TypeScript)

- **Classe base com repasse padrão.** O livro usa uma classe abstrata
  `Decorator` que repassa tudo ao componente, para que os decoradores
  concretos sobrescrevam só o que mudam. `RepositoryDecorator` faz isso:
  `RetryingRepository` sobrescreve só `findById`, e `save` cai no repasse da
  base. Sem essa base, cada decorador teria que repetir o repasse de todos os
  métodos, e esquecer um deles quebraria a interface em runtime.
- **`protected`, não `#private`.** No Bridge o campo do Implementor era
  `#channel`, que nem as subclasses veem. Aqui as subclasses precisam do objeto
  embrulhado, então o campo é `protected readonly inner`. Na prática elas usam
  `super.findById()`, que também funciona dentro de arrow functions (como em
  `LoggingRepository`).
- **Tipagem estrutural.** Qualquer objeto com `findById` e `save` pode ser
  embrulhado: os testes decoram objetos literais para simular erros de
  escrita e erros definitivos. É o "Component sem dados" que o livro recomenda:
  uma interface leve.
- **Não confunda com `@decorator`.** A sintaxe `@algo` do JavaScript e do
  TypeScript (decorators da TC39) modifica **classes e métodos na definição**;
  o padrão Decorator embrulha **objetos em runtime**. Além disso, o Node 24
  ainda não executa essa sintaxe: um `@logged` num método dá
  `SyntaxError: Invalid or unexpected token` com type stripping (verificado no
  Node 24.22).
- **Nada de relógio ou espera reais.** `CachingRepository` recebe `now` e
  `RetryingRepository` recebe `sleep`, então os testes controlam o TTL e
  registram o backoff (100, 200 ms) sem esperar.
- **Simplificações do exemplo:** o cache não guarda ausências (sem _negative
  caching_), devolve a mesma referência a cada acerto (`Product` é `readonly` no
  tipo, mas não congelado em runtime) e não tem limite de tamanho. Uma escrita
  que não passe por ele (direto no banco, ou por outra instância) deixa o cache
  desatualizado até o TTL.

## Padrões relacionados

- **Adapter:** muda a interface de um objeto; o Decorator mantém a interface e
  muda as responsabilidades.
- **Composite:** um decorador é como um composto com um único filho, mas o
  objetivo é acrescentar comportamento, não agregar resultados.
- **Proxy:** mesma estrutura (mesma interface, embrulhando outro objeto), mas
  o Proxy controla o **acesso** ao objeto e costuma criá-lo ele mesmo; o
  Decorator recebe o objeto pronto e pode ser empilhado.
- **Strategy:** o Decorator muda a "pele" de um objeto (por fora); o Strategy
  muda as "entranhas" (o objeto delega uma parte do algoritmo).
- **Chain of Responsibility:** também encadeia objetos com a mesma interface,
  mas cada elo pode parar a cadeia; aqui todos repassam (o cache, num acerto, é
  a exceção que mais se aproxima disso).

## Rodando

```bash
docker compose run --rm node npm run demo -- decorator
docker compose run --rm node node --test src/structural/decorator/decorator.test.ts
```

Os testes provam: as 6 ordens possíveis de cache, retry e log dão o mesmo
resultado para o client (com o banco falhando, depois de um save e para um
produto inexistente); a ordem muda o que cada camada observa (log por fora vê os
pedidos, log por dentro vê as tentativas); o cache evita idas ao banco, expira
pelo TTL, é invalidado pelo save e não guarda ausência; o retry repete só falhas
passageiras, com espera exponencial, desiste no limite e não repete escritas; e
o log registra erros sem engoli-los.
