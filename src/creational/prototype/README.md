# Prototype

> **Categoria:** criação · **Escopo:** objeto · **Dia:** 04 (29/10/2026)

## Intenção

Especificar os tipos de objetos a criar usando uma **instância protótipo**, e
criar novos objetos **copiando** esse protótipo.

## O exemplo

Um serviço de notificações tem templates prontos: e-mail de boas-vindas, SMS de
cobrança. Cada um já vem configurado (remetente, assunto com placeholders, tags
de campanha). A cada envio, o serviço **clona** o template certo, preenche as
variáveis do destinatário e renderiza. O template original nunca é alterado.

O registro de templates é o _Prototype Manager_ do livro: o client pede pelo
nome (`'welcome-email'`) e recebe um clone, sem saber se é `EmailTemplate` ou
`SmsTemplate`. Variações viram **dados, não classes**: o template VIP é um clone
do de boas-vindas com uma tag a mais, registrado com outro nome.

```
 Client ──create('welcome-email')──► TemplateRegistry ──clone()──► protótipo
   │                                 (Prototype Manager)            registrado
   │  recebe um clone novo
   ▼
 fill({ name: 'Ana' }) → render('ana@example.com')

 «interface» NotificationTemplate
 + clone()  + fill()  + addTag()  + render()
   ▲
   ├── EmailTemplate   clone(): new EmailTemplate({ ...cópia do estado })
   └── SmsTemplate     clone(): new SmsTemplate({ ...cópia do estado })
```

| Participante (livro) | Neste exemplo |
|---|---|
| Prototype | `NotificationTemplate` ([notification-template.ts](notification-template.ts)) |
| ConcretePrototype | `EmailTemplate` ([email-template.ts](email-template.ts)), `SmsTemplate` ([sms-template.ts](sms-template.ts)) |
| Prototype Manager | `TemplateRegistry` ([template-registry.ts](template-registry.ts)) |
| Client | [main.ts](main.ts) |

## Aplicabilidade

Use quando o sistema deve ser independente de como seus produtos são criados,
compostos e representados, e:

- as classes a instanciar são especificadas em tempo de execução (ex.: templates
  cadastrados a partir de configuração);
- você quer evitar uma hierarquia de fábricas paralela à hierarquia de produtos;
- as instâncias de uma classe só podem ter poucas combinações de estado: é mais
  prático registrar protótipos prontos e cloná-los do que configurar à mão a
  cada vez.

## Consequências

| | |
|---|---|
| ✅ Adicionar e remover produtos em tempo de execução | `registry.register()` aceita templates novos sem recompilar nada. |
| ✅ Especificar objetos novos variando valores | `welcome-email-vip` é um protótipo derivado, não uma subclasse. |
| ✅ Menos subclasses | Ao contrário do Factory Method, não é preciso uma hierarquia de Creators. |
| ✅ Configuração dinâmica | O conjunto de templates pode vir de um banco ou arquivo. |
| ❌ Cada ConcretePrototype precisa implementar `clone()` corretamente | Um estado mutável esquecido na cópia (um array, um `Map`) faz o clone e o protótipo dividirem o mesmo objeto. É o bug mais comum do padrão. |

## Notas de implementação (TypeScript)

- **Cópia profunda é decisão de cada classe.** O construtor faz
  `[...(state.tags ?? [])]`, e `clone()` passa pelo construtor. É o equivalente
  ao _copy constructor_ do C++ que o livro discute. Sem essa cópia, `addTag()`
  no clone alteraria o protótipo. Testei removê-la: 3 dos 6 testes falham.
- **`structuredClone` e spread (`{ ...obj }`) não servem como `clone()`.** Os
  dois devolvem um objeto comum: sem a classe, sem os métodos e sem os campos
  `#private` (um teste documenta isso). O padrão existe justamente porque só o
  próprio objeto sabe copiar o próprio estado.
- **Retorno covariante:** a interface declara `clone(): NotificationTemplate`,
  mas `EmailTemplate.clone()` devolve `EmailTemplate`, e `render()` devolve
  `EmailMessage`. O TypeScript aceita tipos de retorno mais específicos na
  implementação, então quem tem a classe concreta não precisa de cast.
- **O registro guarda uma cópia do que recebe.** Senão, quem registrou poderia
  continuar alterando o protótipo por fora.
- **`fill()` é a operação de inicialização** que o livro sugere para clones
  (`Initialize`), em vez de passar parâmetros ao `clone()`, que precisa ter a
  mesma assinatura para todos os protótipos. Variável ausente é erro, para
  nunca enviar "Olá, {{name}}" a um cliente.

## Padrões relacionados

- **Abstract Factory:** pode guardar um conjunto de protótipos e cloná-los para
  criar os produtos, em vez de ter uma subclasse de fábrica por família.
- **Composite e Decorator:** estruturas que usam esses padrões costumam se
  beneficiar do Prototype para copiar árvores de objetos inteiras.
- **Factory Method:** alternativa por herança; o Prototype troca as subclasses
  do Creator por instâncias configuradas.

## Rodando

```bash
docker compose run --rm node npm run demo -- prototype
docker compose run --rm node node --test src/creational/prototype/prototype.test.ts
```

Os testes provam: o clone é independente (preencher e marcar o clone não altera
o protótipo); o registro entrega um objeto novo da mesma classe a cada pedido e
guarda uma cópia do que recebeu; um protótipo derivado vira um template novo sem
classe nova; `structuredClone` perde a classe e os campos `#private`; e variável
ausente ou chave desconhecida falham com mensagem clara.
