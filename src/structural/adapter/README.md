# Adapter

> **Categoria:** estrutural · **Escopo:** objeto (e classe, discutido abaixo) · **Dia:** 06 (03/11/2026)

## Intenção

Converter a interface de uma classe em outra interface que os clients esperam.
O Adapter permite que classes com interfaces incompatíveis trabalhem juntas.

## O exemplo

O checkout depende de uma interface própria, `PaymentGateway`: valor em
centavos, resultado `approved` ou `declined` com um motivo padronizado, e
`GatewayUnavailableError` quando o provedor está fora do ar. Os provedores
reais não falam essa língua, e o código deles não pode ser alterado (está em
[vendors/](vendors/)):

| | PayFast (SDK moderno) | Banco legado |
|---|---|---|
| Chamada | `createPayment(params)`, assíncrona | `autorizar(valor, cartao, pedido)`, síncrona |
| Valor | `amount` em centavos | string `"89,90"` |
| Resultado | `status: 'succeeded' \| 'failed'` + `failure_code` | `"<código>\|<NSU>"`, códigos ISO 8583 (`00`, `51`, `54`, `59`, `91`) |
| Fora do ar | lança `PayFastApiError` com `statusCode` 5xx | responde `91` |
| Idempotência | `idempotency_key` | não tem |

Cada adapter converte unidades, status, erros e estilo de chamada. Como os dois
passam a falar `PaymentGateway`, o `CheckoutService` consegue até **trocar de
provedor quando um cai** (fallback), sem saber qual é qual.

```
                                   ┌──► PayFastAdapter ────► PayFastClient.createPayment()
 CheckoutService ──► PaymentGateway┤      (centavos, failure_code, 5xx → indisponível)
   (Client)          (Target)      │
                                   └──► LegacyBankAdapter ─► LegacyBankGateway.autorizar()
                                          (8990 → "89,90", "51|" → insufficient_funds,
                                           síncrono → Promise, "91" → indisponível)
```

| Participante (livro) | Neste exemplo |
|---|---|
| Target | `PaymentGateway` ([payment-gateway.ts](payment-gateway.ts)) |
| Client | `CheckoutService` ([checkout-service.ts](checkout-service.ts)) |
| Adaptee | `PayFastClient` ([vendors/payfast-client.ts](vendors/payfast-client.ts)), `LegacyBankGateway` ([vendors/legacy-bank-gateway.ts](vendors/legacy-bank-gateway.ts)) |
| Adapter | `PayFastAdapter` ([payfast-adapter.ts](payfast-adapter.ts)), `LegacyBankAdapter` ([legacy-bank-adapter.ts](legacy-bank-adapter.ts)) |

## Aplicabilidade

Use quando:

- você quer usar uma classe existente, mas a interface dela não corresponde à
  que você precisa;
- você quer criar uma classe reutilizável que coopere com classes ainda não
  previstas (aqui: o próximo provedor de pagamento);
- (adapter de objeto) você precisa usar várias subclasses existentes, e não é
  prático adaptar a interface de cada uma por herança.

## Consequências

| | |
|---|---|
| ✅ O client não depende de nenhum SDK | Trocar de provedor ou adicionar um terceiro não toca no checkout. |
| ✅ A tradução fica num lugar só | Conversão de valor, mapeamento de códigos e de erros vivem no adapter, testáveis isoladamente. |
| ✅ Um adapter de objeto serve a qualquer subclasse do Adaptee | Os testes passam subclasses espiãs do banco legado e o adapter funciona igual. |
| ❌ Quanto trabalho de adaptação? | Pode ser só renomear (`amount` → `amountCents`) ou reimplementar comportamento (o banco legado não tem idempotência, e o adapter não inventa uma). |
| ❌ A interface do Target nivela por baixo | Recursos que só um provedor oferece (ex.: parcelamento) não cabem sem estender o Target para todos. |

## Notas de implementação (TypeScript)

- **Adapter de objeto, não de classe.** O livro mostra também o _adapter de
  classe_, que herda do Adaptee (herança privada em C++) e implementa o
  Target. Em TypeScript daria para escrever
  `class LegacyBankAdapter extends LegacyBankGateway implements PaymentGateway`,
  mas não existe herança privada: `autorizar()` continuaria público no adapter,
  e o client poderia pular a tradução. Além disso, `extends` só aceita uma
  classe. Por isso usamos composição, recebendo o SDK pelo construtor.
- **Dinheiro em centavos inteiros.** `formatCents` usa só aritmética inteira
  (`Math.trunc` e `%`), porque `0.29 * 100` é `28.999999999999996` em ponto
  flutuante. O checkout rejeita valores que não sejam inteiros seguros e
  positivos.
- **Erros também são interface.** Recusa vira resultado, indisponibilidade
  vira `GatewayUnavailableError` (com `cause` apontando o erro original) e erro
  de formato vira `Error` comum. O fallback do checkout só reage ao segundo
  tipo: recusa é resposta final, e erro de programação não deve ser escondido
  tentando outro provedor.
- **Tipos do Adaptee ficam no adapter.** Só os adapters importam de `vendors/`;
  o checkout e o Target nunca veem `PayFastPayment` ou os códigos ISO 8583.
- **Simplificação do exemplo:** o mesmo `cardToken` serve para os dois
  provedores. Na vida real, tokens de cartão são de cada provedor, e o
  fallback exige um cofre próprio ou _network tokens_.

## Padrões relacionados

- **Bridge:** tem estrutura parecida, mas a intenção é outra: separar
  abstração e implementação **desde o projeto**. O Adapter é aplicado **depois**,
  para fazer conversar classes que já existem.
- **Decorator:** acrescenta responsabilidades **sem mudar** a interface; o
  Adapter **muda** a interface.
- **Proxy:** fornece um substituto com a **mesma** interface do objeto.
- **Facade:** também envolve código existente, mas define uma interface nova e
  mais simples para um subsistema inteiro, em vez de converter uma interface
  para outra já esperada.

## Rodando

```bash
docker compose run --rm node npm run demo -- adapter
docker compose run --rm node node --test src/structural/adapter/adapter.test.ts
```

Os testes provam: com qualquer um dos dois adapters, o checkout recebe os mesmos
status padronizados (aprovado e cada motivo de recusa); o banco legado recebe
os centavos convertidos para `"reais,centavos"` sem ponto flutuante; com o
primeiro provedor fora do ar o checkout usa o próximo, mas recusa e erro de
formato não acionam o fallback e todos fora do ar vira `GatewayUnavailableError`;
o pedido é a chave de idempotência na PayFast (retry não cobra duas vezes); e
valores que não são centavos inteiros positivos são rejeitados.
