# Abstract Factory

> **Categoria:** criação · **Escopo:** objeto · **Dia:** 01 (26/10/2026)

## Intenção

Fornecer uma interface para criar **famílias de objetos relacionados ou
dependentes** sem especificar suas classes concretas.

## O exemplo

Um serviço publica relatórios: grava o arquivo num _object storage_ e avisa
outros sistemas por uma fila. O mesmo código precisa rodar na AWS (S3 + SQS) ou
na Azure (Blob Storage + Service Bus), e **nunca misturar os dois**: um arquivo
no S3 anunciado pelo Service Bus é uma configuração inválida.

```
            ┌──────────────────────────┐
            │ «interface»              │          ┌────────────────┐
            │ CloudProviderFactory     │◄─────────│ ReportPublisher│ (Client)
            │ + createStorage()        │          └───────┬────────┘
            │ + createQueue()          │                  │ usa só as interfaces
            └──────────▲───────────────┘                  ▼
          ┌────────────┴────────────┐        ObjectStorage · MessageQueue
   ┌──────┴─────┐            ┌──────┴──────┐
   │ AwsFactory │            │ AzureFactory│
   └──────┬─────┘            └──────┬──────┘
     cria │ S3Storage          cria │ BlobStorage
          │ SqsQueue                │ ServiceBusQueue
```

| Participante (livro) | Neste exemplo |
|---|---|
| AbstractFactory | `CloudProviderFactory` ([cloud-provider-factory.ts](cloud-provider-factory.ts)) |
| ConcreteFactory | `AwsFactory`, `AzureFactory` ([families/](families/)) |
| AbstractProduct | `ObjectStorage`, `MessageQueue` ([products.ts](products.ts)) |
| ConcreteProduct | `S3Storage`, `SqsQueue`, `BlobStorage`, `ServiceBusQueue` |
| Client | `ReportPublisher` ([report-publisher.ts](report-publisher.ts)) |

## Aplicabilidade

Use quando:

- o sistema deve ser independente de como seus produtos são criados e compostos;
- o sistema deve ser configurado com **uma** entre várias famílias de produtos;
- os produtos de uma família foram feitos para serem usados juntos, e você quer
  garantir essa restrição;
- você quer expor uma biblioteca de produtos revelando só as interfaces.

## Consequências

| | |
|---|---|
| ✅ Isola as classes concretas | O client manipula apenas interfaces; os nomes `S3Storage`/`BlobStorage` não aparecem nele. |
| ✅ Troca de família fácil | A fábrica concreta aparece uma vez (em [main.ts](main.ts)); trocar de nuvem é trocar uma linha. |
| ✅ Consistência entre produtos | Uma fábrica só sabe criar produtos da própria família. |
| ❌ Novos _tipos_ de produto são caros | Adicionar um `SecretManager` muda a interface da fábrica e **todas** as fábricas concretas. |

## Notas de implementação (TypeScript)

- **Interface em vez de classe abstrata:** a fábrica não tem comportamento
  compartilhado, então `interface` basta e não acopla por herança.
- **Produtos concretos não são exportados:** fora de `families/` só existe a
  fábrica. Isso força o client a passar por ela.
- **Fábricas como singletons:** o livro sugere uma instância por família. Aqui
  isso vem de criar a fábrica uma vez na composição (`main.ts`) e injetá-la, sem
  precisar de um Singleton de verdade.
- **Parâmetros de configuração** (região, conta) ficam no construtor da fábrica
  concreta, não espalhados pelo client.

## Padrões relacionados

- **Factory Method:** as operações `create*` de cada fábrica concreta são
  factory methods.
- **Prototype:** alternativa para implementar a fábrica quando há muitas famílias.
- **Singleton:** uma fábrica concreta costuma ter uma única instância.

## Rodando

```bash
docker compose run --rm node npm run demo -- abstract-factory
docker compose run --rm node node --test src/creational/abstract-factory/abstract-factory.test.ts
```

Os testes provam: todos os produtos criados por uma fábrica pertencem à mesma
família, o client publica usando só a família injetada, e cada fábrica gera URLs
no formato do seu provedor.
