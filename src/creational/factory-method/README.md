# Factory Method

> **Categoria:** criação · **Escopo:** classe · **Dia:** 03 (28/10/2026)

## Intenção

Definir uma interface para criar um objeto, mas deixar as **subclasses**
decidirem qual classe instanciar. O Factory Method permite a uma classe adiar a
instanciação para suas subclasses.

## O exemplo

Receber um webhook é sempre o mesmo algoritmo: verificar a assinatura, rejeitar
se for inválida, fazer o parse do corpo. O que muda de provedor para provedor é
**como** a assinatura é verificada:

| Provedor | Cabeçalho | HMAC-SHA256 sobre | Extra |
|---|---|---|---|
| Stripe | `stripe-signature: t=<unix>,v1=<hex>` | `<t>.<corpo>` | janela de 5 min contra replay; vários `v1` na rotação de segredo |
| GitHub | `x-hub-signature-256: sha256=<hex>` | corpo cru | — |

`WebhookReceiver.receive()` implementa o algoritmo e chama o factory method
`createVerifier()`, que cada subclasse sobrescreve para criar o seu verificador.

```
 «abstract» WebhookReceiver                 «interface» SignatureVerifier
 + receive(body, headers)                   + verify(body, headers)
 # createVerifier()
   ▲                                          ▲
   ├── StripeWebhookReceiver  - - cria - - >  ├── StripeSignatureVerifier
   └── GitHubWebhookReceiver  - - cria - - >  └── GitHubSignatureVerifier
```

As duas hierarquias andam em paralelo (cada receiver tem o seu verificador), um
dos usos que o livro destaca: o factory method **conecta hierarquias paralelas**.

| Participante (livro) | Neste exemplo |
|---|---|
| Product | `SignatureVerifier` ([signature-verifier.ts](signature-verifier.ts)) |
| ConcreteProduct | `StripeSignatureVerifier` ([stripe-webhook.ts](stripe-webhook.ts)), `GitHubSignatureVerifier` ([github-webhook.ts](github-webhook.ts)) |
| Creator | `WebhookReceiver` ([webhook-receiver.ts](webhook-receiver.ts)): `receive()` é a "AnOperation" do livro, `createVerifier()` é o factory method |
| ConcreteCreator | `StripeWebhookReceiver`, `GitHubWebhookReceiver` |

## Aplicabilidade

Use quando:

- uma classe não consegue antecipar a classe dos objetos que precisa criar;
- uma classe quer que suas subclasses especifiquem os objetos que ela cria;
- classes delegam responsabilidade a uma entre várias subclasses auxiliares, e
  você quer localizar o conhecimento de qual subclasse auxiliar é a delegada.

## Consequências

| | |
|---|---|
| ✅ Elimina o acoplamento a classes concretas | `receive()` só conhece `SignatureVerifier`; adicionar um provedor não toca nele. |
| ✅ Gancho para subclasses | Um provedor novo é uma subclasse com um método (o teste cria uma assim, `AllowListReceiver`). |
| ✅ Conecta hierarquias paralelas | Cada receiver sabe qual verificador combina com ele. |
| ❌ Uma subclasse só para criar um objeto | Se o receiver não tiver outra razão para ser subclasse, a herança é custo puro. |
| ❌ Herança acopla mais que composição | A subclasse depende do ciclo de vida da base (veja a armadilha do construtor abaixo). |

## Notas de implementação (TypeScript)

- **Aqui `abstract class` é necessária**, ao contrário do Abstract Factory: o
  Creator tem comportamento (`receive()`) que as subclasses herdam. O factory
  method é `protected abstract`, então o compilador obriga toda subclasse a
  implementá-lo e o client não consegue chamá-lo.
- **Não chame o factory method no construtor da base.** Em JavaScript, o
  construtor da classe base roda **antes** de os campos da subclasse existirem.
  Se `WebhookReceiver` chamasse `createVerifier()` no construtor, o
  `this.#secret` da subclasse ainda não estaria lá e o resultado seria
  `TypeError: Cannot read private member #secret`. Por isso o verificador é
  criado sob demanda (`this.#verifier ??= this.createVerifier()`), a mesma
  _inicialização preguiçosa_ que o livro mostra em C++. Em C++ o problema é
  parecido: a chamada virtual no construtor não despacha para a subclasse.
- **ConcreteProducts não são exportados**: cada verificador vive no arquivo do
  seu receiver, e só a subclasse sabe criá-lo.
- **Variação parametrizada:** o livro também mostra um único factory method que
  recebe um identificador (`create(provider: 'stripe' | 'github')`). Isso troca
  herança por um `switch` e é mais comum em TypeScript, mas deixa de ser
  extensível sem editar o Creator.
- **Segurança de verdade, não só didática:** comparação em tempo constante
  (`timingSafeEqual`) e janela de tempo contra replay na Stripe, com o relógio
  injetado para o teste ser determinístico.

## Padrões relacionados

- **Abstract Factory:** costuma ser implementado com factory methods (um por
  produto da família).
- **Template Method:** `receive()` é um template method e o factory method é um
  dos seus passos; os dois padrões aparecem juntos com frequência.
- **Prototype:** cria objetos sem subclasses do Creator, ao custo de exigir uma
  operação de inicialização no produto.

## Rodando

```bash
docker compose run --rm node npm run demo -- factory-method
docker compose run --rm node node --test src/creational/factory-method/factory-method.test.ts
```

Os testes provam: o mesmo `receive()` aceita cada provedor com o verificador
que a subclasse criou e rejeita o formato do outro provedor; uma subclasse nova
estende o fluxo sem alterar o Creator e o produto é criado uma vez só; corpo
adulterado, segredo errado, cabeçalho ausente e timestamp fora da janela são
rejeitados; e a Stripe aceita qualquer `v1` válido na rotação de segredos.
