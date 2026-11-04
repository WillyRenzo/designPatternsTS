# Bridge

> **Categoria:** estrutural · **Escopo:** objeto · **Dia:** 07 (04/11/2026)

## Intenção

Desacoplar uma abstração da sua implementação, de modo que as duas possam variar
independentemente.

## O exemplo

Um backend manda dois tipos de notificação, **alerta de incidente** e
**lembrete de fatura**, por três canais: **e-mail, SMS e Slack**. As duas coisas
variam por motivos diferentes:

- a notificação decide **o que dizer**, para quem e quando é urgente (crítico
  é urgente, aviso não; fatura vencida é urgente, a vencer não);
- o canal decide **como entregar**: endereço (e-mail, telefone, ID do Slack),
  formato (assunto, negrito, sem quebra de linha) e limites (SMS em 160
  caracteres).

Com herança, cada combinação vira uma classe (`EmailIncidentAlert`,
`SmsIncidentAlert`, `SlackInvoiceReminder`…): 2 × 3 = 6 classes, e um canal
novo exige uma classe para cada notificação. Com o Bridge são duas hierarquias
ligadas por uma referência: 2 + 3 = 5 classes, e cada lado cresce sozinho.

```
        Abstraction                              Implementor
  ┌─────────────────────┐   #channel   ┌────────────────────────────┐
  │ Notification        │─────────────►│ MessageChannel             │
  │  deliver(to, título,│    (ponte)   │  send({to, title, body,    │
  │    corpo, urgente)  │              │        urgent})            │
  └──────────┬──────────┘              └──────────────┬─────────────┘
       ┌─────┴───────┐                   ┌───────────┼───────────┐
 IncidentAlert InvoiceReminder       EmailChannel SmsChannel SlackChannel
   raise()       remind()            [URGENTE]    160 chars  :rotating_light:
```

| Participante (livro) | Neste exemplo |
|---|---|
| Abstraction | `Notification` ([notification.ts](notification.ts)) |
| RefinedAbstraction | `IncidentAlert` ([incident-alert.ts](incident-alert.ts)), `InvoiceReminder` ([invoice-reminder.ts](invoice-reminder.ts)) |
| Implementor | `MessageChannel` ([message-channel.ts](message-channel.ts)) |
| ConcreteImplementor | `EmailChannel`, `SmsChannel`, `SlackChannel` ([channels/](channels/)) |
| Client | a composição em [main.ts](main.ts), que escolhe qual canal cada notificação usa |

O Implementor oferece só a operação **primitiva** (`send` de uma mensagem com
título, corpo e urgência). As operações de **alto nível** (`raise` para o
plantão, `remind` com prazo e valor formatados) ficam nas abstrações e são
construídas sobre ela, como o livro descreve.

## Aplicabilidade

Use quando:

- você quer evitar uma ligação permanente entre a abstração e a implementação,
  por exemplo para escolher a implementação na composição ou em runtime (na
  demo, o mesmo alerta vai por Slack e, no escalonamento, por SMS);
- tanto a abstração quanto a implementação devem ser extensíveis por
  subclasses (ou, em TS, por novos objetos que satisfaçam a interface);
- mudanças na implementação não devem obrigar o client a recompilar ou mudar;
- você tem uma "proliferação de classes" por herança em duas dimensões, o que
  Rumbaugh chama de _generalizações aninhadas_.

## Consequências

| | |
|---|---|
| ✅ Abstração e implementação desacopladas | `IncidentAlert` não sabe que existe limite de SMS; `SmsChannel` não sabe o que é uma fatura. |
| ✅ Extensibilidade nas duas dimensões | Os testes criam um canal novo (um objeto literal) e uma notificação nova (`PasswordResetNotice`) sem tocar no código existente. |
| ✅ Detalhes de implementação escondidos | A regra de truncar, o prefixo `[URGENTE]` e o endereçamento ficam só no canal. |
| ❌ A interface do Implementor precisa ser projetada com antecedência | Se uma notificação quiser um botão no Slack ou um anexo no e-mail, `ChannelMessage` precisa crescer para todos os canais, ou o recurso não cabe. |
| ❌ Uma indireção a mais | Para um único tipo de notificação e um único canal, a ponte é cerimônia sem retorno. |

## Notas de implementação (TypeScript)

- **Abstraction como classe abstrata, Implementor como interface.** A
  abstração tem estado (a referência ao canal) e código compartilhado
  (`deliver`, que valida o título), por isso é `abstract class`. O
  Implementor não tem nada para herdar, então é `interface`. Com tipagem
  estrutural, qualquer objeto com `name` e `send` serve de canal: os testes
  usam um objeto literal que só registra as mensagens.
- **`#channel` é mais fechado que o `protected` do C++.** No livro, o `imp` da
  Abstraction costuma ser acessível às subclasses. Um campo `#private` não é
  visível nem para quem herda: `this.#channel` numa subclasse dá
  `TS18013: Property '#channel' is not accessible outside class 'Notification'`
  (verificado). Por isso a base expõe `protected deliver()`, e toda entrega
  passa pela validação dela.
- **Quem cria o Implementor.** O livro discute a abstração escolher a
  implementação sozinha ou receber de uma Abstract Factory. Aqui ela recebe o
  canal pelo construtor e a decisão fica na composição (`main.ts`). Não há
  parameter properties (`erasableSyntaxOnly`), então o campo é declarado e
  atribuído no construtor.
- **Sem o problema do `pimpl`.** Em C++ o Bridge também serve para esconder a
  implementação do header e evitar recompilação. Em TS o client depende só do
  tipo `MessageChannel` (`import type`, apagado em runtime), então esse
  benefício vem de graça.
- **Simplificação do exemplo:** o SMS conta caracteres. Na operadora o limite
  depende da codificação: 160 em GSM-7, mas 70 em UCS-2, que é o que acentos
  como "í" e "ê" exigem. Valores e prazos chegam prontos (centavos inteiros,
  `daysUntilDue`) para o exemplo não depender de ponto flutuante nem do relógio.

## Padrões relacionados

- **Adapter:** estrutura parecida (um objeto delegando a outro por uma
  interface), mas aplicado **depois**, para fazer classes já existentes
  conversarem. O Bridge é decidido **no projeto**, para que as duas
  hierarquias possam evoluir separadas.
- **Abstract Factory:** pode criar e configurar o Implementor certo (por
  exemplo, uma família de canais por região ou por cliente).
- **Strategy:** o canal parece uma estratégia injetada. A diferença é de
  intenção: no Bridge a abstração **também** é uma hierarquia que varia, e o
  foco é a estrutura de duas dimensões, não trocar um algoritmo.

## Rodando

```bash
docker compose run --rm node npm run demo -- bridge
docker compose run --rm node node --test src/structural/bridge/bridge.test.ts
```

Os testes provam: as 2 notificações e os 3 canais (5 classes) cobrem as 6
combinações, cada uma com o endereço do canal e o conteúdo da notificação; um
canal novo funciona com as notificações existentes e mostra a urgência que cada
uma decide; uma notificação nova funciona com os canais existentes; as regras de
formato ficam no canal (SMS cortado em 160 caracteres, e-mail e Slack com o
texto inteiro); o lembrete formata prazo e valor sem ponto flutuante; e o alerta
vai para todo o plantão, com plantão vazio tratado como erro.
