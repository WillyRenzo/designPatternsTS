# Facade

> **Categoria:** estrutural · **Escopo:** objeto · **Dia:** 10 (25/11/2026)

## Intenção

Fornecer uma interface unificada para um conjunto de interfaces em um
subsistema. O Facade define uma interface de nível mais alto que torna o
subsistema mais fácil de usar.

## O exemplo

Fechar um pedido envolve cinco classes, cada uma com suas regras e seus
erros ([subsystem/](subsystem/)):

| Classe | Faz | Falha com |
|---|---|---|
| `ProductCatalog` | preço oficial de cada SKU | (produto ausente) |
| `Inventory` | `reserve` (tudo ou nada), `commit`, `release` | `OutOfStockError` |
| `PaymentProcessor` | `charge`, `refund` | `PaymentDeclinedError` |
| `ShippingService` | `quote` (frete grátis acima de R$ 300,00), `createLabel` | `InvalidAddressError`, `CarrierUnavailableError` |
| `Mailer` | `send` | `MailDeliveryError` |

Sem a fachada, cada lugar que fecha um pedido (API, app, importação de
marketplace) teria que repetir a ordem certa dos passos **e** o que desfazer
quando um deles falha. A `CheckoutFacade` concentra isso em um método:

```
 client ──► CheckoutFacade.placeOrder(request) ──► OrderReceipt | CheckoutError
                 │
                 ├─ 1. catalog.find          (preço de cada item; nada muda ainda)
                 ├─ 2. shipping.quote        (CEP válido? frete)
                 ├─ 3. inventory.reserve     ──── desfaz: inventory.release
                 ├─ 4. payments.charge       ──── desfaz: payments.refund
                 ├─ 5. shipping.createLabel     ✗ falhou? desfaz 4 e 3, nessa ordem
                 ├─ 6. inventory.commit
                 └─ 7. mailer.send           (melhor esforço: bounce não desfaz o pedido)
```

| Participante (livro) | Neste exemplo |
|---|---|
| Facade | `CheckoutFacade` ([checkout-facade.ts](checkout-facade.ts)) |
| Classes do subsistema | `ProductCatalog`, `Inventory`, `PaymentProcessor`, `ShippingService`, `Mailer` ([subsystem/](subsystem/)) |
| Client | [main.ts](main.ts) (e o backoffice, que usa o subsistema direto) |

## Aplicabilidade

Use quando:

- você quer uma interface simples para um subsistema complexo: a maioria dos
  clients só quer "fechar o pedido";
- há muitas dependências entre os clients e as classes do subsistema, e a
  fachada desacopla os dois lados (quem fecha pedidos só conhece
  `CheckoutFacade` e `CheckoutError`; as classes de `subsystem/` aparecem
  apenas na composição);
- você quer organizar o subsistema em camadas, com a fachada como ponto de
  entrada de cada uma.

## Consequências

| | |
|---|---|
| ✅ Menos objetos para o client lidar | Uma chamada, um tipo de retorno, um tipo de erro (`CheckoutError.reason`). |
| ✅ Acoplamento fraco | O subsistema pode trocar de transportadora ou de processador de pagamento sem mudar quem fecha pedidos. |
| ✅ Não impede o uso direto | O backoffice estorna e consulta estoque nas próprias classes, e os testes conferem isso. A fachada é um atalho, não uma tranca. |
| ❌ Tende a crescer | Toda variação do caso de uso ("pedido sem frete", "pagamento em duas etapas") pressiona por mais parâmetros ou mais métodos. Quando isso acontece, vale uma segunda fachada em vez de uma fachada-deus. |
| ❌ Coordenação vira responsabilidade dela | A ordem dos passos e as compensações moram na fachada. Desligando o laço de compensação, dois testes quebram (estoque preso e cobrança sem estorno). A fachada simples por fora é a parte crítica por dentro. |

## Notas de implementação (TypeScript)

- **Subsistema público, fachada como conveniência.** O livro discute reduzir o
  acoplamento tornando as classes do subsistema privadas (em C++, ou com
  pacotes em Java). Em TS daria para não exportar o subsistema de um
  `index.ts`, mas aqui ele é exportado de propósito: o livro diz que a
  fachada **não** deve impedir o uso direto por quem precisa de mais controle.
- **Erros traduzidos com `cause`.** Cada classe do subsistema tem sua classe
  de erro. A fachada converte as conhecidas em `CheckoutError` com um `reason`
  em union de literais e guarda o original em `cause` (`ErrorOptions`, do
  ES2022). Erros desconhecidos passam intactos: bug não vira "pagamento
  recusado".
- **Compensação em lista.** Cada passo que muda estado empilha uma função que
  o desfaz (`compensations.push(() => inventory.release(reservation))`). Na
  falha, as funções rodam na ordem inversa. Closures substituem o objeto
  Command que o C++ exigiria.
- **Subsistema injetado inteiro.** A fachada recebe um objeto
  `CheckoutSubsystem` com as cinco dependências. Em testes, cada uma pode ser
  trocada por outra com a mesma forma (tipagem estrutural), sem herança.
- **Simplificações do exemplo:** tudo é síncrono e em memória. Com serviços
  reais, cada passo é uma chamada de rede, e uma compensação também pode
  falhar (o estorno cai junto com o gateway). Isso leva a sagas, filas e
  retentativas, que estão fora do escopo do padrão. Um número de pedido também
  é consumido por pedidos que falham.

## Padrões relacionados

- **Abstract Factory:** pode criar as classes do subsistema de forma
  independente de plataforma, e ser usada junto com a fachada (ou no lugar
  dela, para esconder classes específicas).
- **Mediator:** também centraliza a coordenação, mas os colegas **conhecem** o
  mediador e conversam por ele. As classes do subsistema não sabem que a
  fachada existe.
- **Singleton:** muitas vezes basta uma fachada por subsistema. Aqui ela é
  criada uma vez na composição, sem Singleton.
- **Adapter:** converte uma interface existente em outra já esperada; a
  fachada **define** uma interface nova e mais simples para várias classes.

## Rodando

```bash
docker compose run --rm node npm run demo -- facade
docker compose run --rm node node --test src/structural/facade/facade.test.ts
```

Os testes provam: uma chamada ao `placeOrder` coordena catálogo, estoque,
pagamento, frete e e-mail; o preço vem do catálogo e o frete é grátis a partir
de R$ 300,00; cartão recusado libera a reserva; transportadora fora do ar depois
da cobrança estorna o pagamento e libera o estoque; falhas antes de mudar estado
(sem estoque, inclusive somando linhas repetidas, CEP inválido, produto
desconhecido, carrinho vazio ou quantidade inválida) não deixam rastro; o client
só recebe `CheckoutError`, com o erro original em `cause`; um bounce de e-mail não
desfaz o pedido; e as classes do subsistema continuam usáveis sem a fachada.
