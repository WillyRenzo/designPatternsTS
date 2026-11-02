# Singleton

> **Categoria:** criação · **Escopo:** objeto · **Dia:** 05 (02/11/2026)

## Intenção

Garantir que uma classe tenha **somente uma instância** e fornecer um **ponto
global de acesso** a ela.

## O exemplo

Um serviço expõe métricas no formato do Prometheus. Vários módulos (pedidos,
pagamentos) incrementam contadores, e o endpoint `GET /metrics` precisa
devolver **todos** eles. Se cada módulo criasse o seu registro, o `/metrics`
leria só um deles e as outras métricas sumiriam. É o mesmo desenho do registro
padrão do `prom-client`.

Os módulos não recebem o registro por parâmetro: eles o buscam no ponto global
`MetricsRegistry.getInstance()`. Os dois handlers declaram o mesmo
`http_requests_total`, e as séries se somam no mesmo lugar.

```
 orders-handler.ts ───┐
                      ├──► MetricsRegistry.getInstance() ──► única instância
 payments-handler.ts ─┘                                       ├─ http_requests_total
                                                              ├─ orders_total
 GET /metrics ──────────► MetricsRegistry.getInstance()       ├─ payments_total
                          .render()                           └─ payments_amount_cents_total

 MetricsRegistry
 - static #instance
 - private constructor(token)
 + static getInstance()
 + static resetForTests()
 + counter(name, help)
 + render()
```

| Participante (livro) | Neste exemplo |
|---|---|
| Singleton | `MetricsRegistry` ([metrics-registry.ts](metrics-registry.ts)): `getInstance()` é a operação de classe `Instance()` do livro |
| Clients | `handleCreateOrder` ([orders-handler.ts](orders-handler.ts)), `handleCharge` ([payments-handler.ts](payments-handler.ts)), o `/metrics` em [main.ts](main.ts) |

`Counter` ([counter.ts](counter.ts)) não é participante: é o estado que o
Singleton guarda.

## Aplicabilidade

Use quando:

- precisa haver **exatamente uma** instância de uma classe, acessível aos
  clients a partir de um ponto conhecido;
- essa única instância deve poder ser estendida por subclasses, e os clients
  devem usar a instância estendida sem alterar o código.

## Consequências

| | |
|---|---|
| ✅ Acesso controlado à única instância | A classe decide quando e como a instância nasce (aqui, no primeiro acesso). |
| ✅ Evita variáveis globais soltas | O estado fica encapsulado, com validação (nome de métrica, descrição conflitante, decremento). |
| ✅ Mais flexível que operações estáticas | É um objeto: pode implementar interfaces e ser passado adiante quando necessário. |
| ❌ Estado global vaza entre testes | Todo teste precisa de `beforeEach(resetForTests)`, e testes em paralelo no mesmo processo dividiriam o registro. |
| ❌ Dependência escondida | A assinatura de `handleCharge(amountCents, approved)` não revela que ela escreve em métricas. |
| ❌ "Único" depende do carregamento do módulo | Em ESM, o mesmo arquivo carregado por URLs diferentes gera dois singletons (veja abaixo). |

## Notas de implementação (TypeScript)

- **`private constructor` é só para o compilador.** O modificador é apagado no
  type stripping, então `Reflect.construct(MetricsRegistry, [])` criaria uma
  segunda instância. O construtor exige um `Symbol` privado do módulo, e um
  teste prova que o bloqueio vale em runtime.
- **`static #instance` + `??=`** é a inicialização preguiçosa do livro. Como o
  JavaScript executa em uma única thread, não existe a corrida de duas threads
  criando a instância ao mesmo tempo (o problema do _double-checked locking_
  em Java e C++).
- **O singleton é por módulo carregado, não por processo.** Testei no Node 24:
  importar `metrics-registry.ts` e `metrics-registry.ts?segunda-copia` gera
  duas classes e duas instâncias (um teste documenta isso). Na prática, isso
  acontece quando duas versões do mesmo pacote convivem no `node_modules`, ou
  no _dual package hazard_ entre ESM e CommonJS. A defesa usada por bibliotecas
  é guardar a instância em `globalThis[Symbol.for('…')]`, ao custo de as duas
  versões dividirem um objeto que talvez não seja compatível entre elas.
- **Um `export const registry = new MetricsRegistry()` também seria único**
  (os módulos ES são avaliados uma vez) e mais simples. O que a classe
  acrescenta é a criação preguiçosa e o gancho de reset para testes.

### Alternativa: uma instância só, por injeção

O problema que o Singleton resolve (uma instância compartilhada) é diferente
do que ele impõe (acesso global). Seguindo a AFA 01, a alternativa é criar o
registro **uma vez na raiz da aplicação** e passá-lo pelos construtores, como
o `main.ts` do [Abstract Factory](../abstract-factory/) faz com as fábricas.
Num esboço dessa variante, o registro teria construtor público e os handlers
seriam classes:

```ts
const metrics = new MetricsRegistry();            // única por convenção
const orders = new OrdersHandler(metrics);        // dependência explícita
const payments = new PaymentsHandler(metrics);
```

Assim, cada teste cria o seu registro, a dependência aparece na assinatura e
não é preciso `resetForTests()`. O Singleton clássico continua fazendo sentido
quando não dá para controlar a raiz: bibliotecas que oferecem um registro
padrão (`prom-client`) ou código legado sem injeção de dependência.

## Padrões relacionados

- **Abstract Factory, Builder e Prototype:** podem ser implementados como
  Singleton quando basta uma fábrica, um diretor ou um registro de protótipos.
  Nos exemplos deste repositório, preferimos uma instância única criada na raiz.
- **Facade:** costuma bastar uma fachada por subsistema, e ela é com frequência
  um Singleton.

## Rodando

```bash
docker compose run --rm node npm run demo -- singleton
docker compose run --rm node node --test src/creational/singleton/singleton.test.ts
```

Os testes provam: `getInstance()` devolve sempre a mesma instância; módulos que
não se conhecem escrevem no mesmo registro; o construtor é bloqueado também em
runtime; `resetForTests()` descarta o estado global; o `render()` segue o
formato do Prometheus, com labels ordenados e escapados; nome inválido,
descrição conflitante e decremento são rejeitados; e o mesmo arquivo carregado
como outro módulo cria outro singleton (o limite do padrão em ESM).
