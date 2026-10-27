# Builder

> **Categoria:** criação · **Escopo:** objeto · **Dia:** 02 (27/10/2026)

## Intenção

Separar a **construção** de um objeto complexo da sua **representação**, de modo
que o mesmo processo de construção possa criar representações diferentes.

## O exemplo

Um client da API de pedidos precisa montar requisições sempre do mesmo jeito:
rota certa, `Authorization`, `Accept`, `Idempotency-Key` no POST, corpo JSON. Às
vezes ele quer a requisição para **executar** (`Request` do `fetch`), às vezes
para **mostrar** (um comando `curl` para log, documentação ou debug).

O conhecimento da API fica num lugar só (o Director), e cada representação fica
num builder. Uma terceira representação (ex.: arquivo `.http` do VS Code) é um
builder novo, sem tocar no Director.

```
 ┌───────────────────────────┐  builder   ┌──────────────────────────┐
 │ OrdersApiDirector         │───────────►│ «interface»              │
 │ + constructCreateOrder()  │            │ HttpRequestBuilder       │
 │ + constructListOrders()   │            │ + setMethod() + setUrl() │
 └───────────────────────────┘            │ + addQueryParam()        │
                                          │ + addHeader()            │
                                          │ + setJsonBody()          │
                                          └────────────▲─────────────┘
                                   ┌───────────────────┴────────────────┐
                       ┌───────────┴────────────┐          ┌────────────┴───────────┐
                       │ FetchRequestBuilder    │          │ CurlCommandBuilder     │
                       │ + getResult(): Request │          │ + getResult(): string  │
                       └────────────────────────┘          └────────────────────────┘
```

Sequência (igual à colaboração descrita no livro):

1. O client cria o builder concreto e o entrega ao Director.
2. O Director chama os passos na ordem: método, URL, cabeçalhos, query, corpo.
3. O builder acumula as partes.
4. O client pega o produto **no builder** (`getResult()`), não no Director.

| Participante (livro) | Neste exemplo |
|---|---|
| Builder | `HttpRequestBuilder` ([http-request-builder.ts](http-request-builder.ts)) |
| ConcreteBuilder | `FetchRequestBuilder` ([fetch-request-builder.ts](fetch-request-builder.ts)), `CurlCommandBuilder` ([curl-command-builder.ts](curl-command-builder.ts)) |
| Director | `OrdersApiDirector` ([orders-api-director.ts](orders-api-director.ts)) |
| Product | `Request` (Web API) e `string` (comando curl) |
| Client | [main.ts](main.ts) |

## Aplicabilidade

Use quando:

- o algoritmo de criação de um objeto complexo deve ser independente das partes
  que o compõem e de como elas são montadas;
- o processo de construção deve permitir **representações diferentes** do objeto
  construído.

## Consequências

| | |
|---|---|
| ✅ Varia a representação interna do produto | Trocar `Request` por `curl` é trocar o builder; o Director não muda. |
| ✅ Isola o código de construção do de representação | Rotas, autenticação e cabeçalhos obrigatórios vivem só no Director; formatação de curl só no builder dele. |
| ✅ Controle fino do processo | A requisição é montada passo a passo, e o builder rejeita passos fora de ordem (`addQueryParam` antes de `setUrl`). |
| ❌ Interface do Builder precisa servir a todos | Um passo que só faz sentido para uma representação (ex.: `--retry` do curl) obriga a decidir o que os outros builders fazem com ele. |
| ❌ Mais classes | Para uma representação só, um Director + Builder é cerimônia; uma função basta. |

## Notas de implementação (TypeScript)

- **Sem `getResult()` na interface:** os produtos (`Request` e `string`) não têm
  supertipo útil, como o livro aponta. Por isso o resultado vem do builder
  concreto, e o client mantém a referência tipada a ele.
- **Passos retornam `void`, não `this`:** o _fluent builder_
  (`new X().a().b().build()`) é outra variação, popularizada pelo _Effective
  Java_, que resolve construtores com muitos parâmetros opcionais. Ela dispensa
  o Director e não troca de representação. Aqui o foco é o Builder do GoF.
- **Sem métodos vazios por padrão:** no livro, o Builder é uma classe com
  operações vazias, e cada ConcreteBuilder sobrescreve só o que lhe interessa.
  Com `interface`, todo builder implementa todos os passos, e o compilador
  avisa quando um passo novo é adicionado. Se surgir um passo que só faz sentido
  para alguns builders, uma classe abstrata com no-ops volta a fazer sentido.
- **Passos dependentes falham cedo:** `#requireUrl()` lança erro se um passo
  que precisa da URL roda antes de `setUrl()`, em vez de produzir uma
  requisição inválida.
- **O builder do curl escapa os valores para o shell** (`'` vira `'\''`),
  porque um corpo JSON com apóstrofo quebraria o comando.

## Padrões relacionados

- **Abstract Factory:** também cria objetos complexos, mas entrega o produto
  imediatamente e foca em **famílias**; o Builder monta **um** produto passo a
  passo e o entrega no final.
- **Composite:** é comum um Builder montar uma estrutura Composite (ex.: árvore
  de um documento).

## Rodando

```bash
docker compose run --rm node npm run demo -- builder
docker compose run --rm node npm test
```
