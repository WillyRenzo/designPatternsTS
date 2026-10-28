# Plano de Estudo

Um padrão por dia, na ordem do catálogo do livro. As ideias de exemplo são
sugestões: a decisão final de cada dia é do Willy, e um cenário só serve se
deixar claro o problema que o padrão resolve. O status oficial fica no roteiro do
`README.md` raiz.

## Critérios de pronto (todo dia)

- README preenchido a partir do template, com a tabela livro → código.
- `main.ts` mostrando o padrão em ação, de preferência comparando duas variações.
- Teste que prova a propriedade central do padrão.
- `typecheck` e `test` verdes; ✅ no roteiro.

## Criação

| Dia | Padrão | Ideia de exemplo | Propriedade a testar |
|---|---|---|---|
| 01 | Abstract Factory ✅ | Famílias de nuvem (AWS: S3 + SQS; Azure: Blob + Service Bus) | produtos da mesma fábrica são da mesma família |
| 02 | Builder ✅ | Requisições da API de pedidos montadas pelo Director como `Request` (fetch) ou comando curl | mesma sequência de passos gera representações diferentes |
| 03 | Factory Method ✅ | Recebimento de webhooks (Stripe, GitHub): a subclasse cria o verificador de assinatura HMAC | a classe base não conhece o produto concreto |
| 04 | Prototype | Templates de notificação clonados e personalizados | o clone é independente do original (cópia profunda) |
| 05 | Singleton | Registro de configuração; comparar com injeção na raiz | instância única e seus custos para testar |

## Estruturais

| Dia | Padrão | Ideia de exemplo | Propriedade a testar |
|---|---|---|---|
| 06 | Adapter | Gateways de pagamento com APIs diferentes atrás de uma interface | o client usa um contrato único |
| 07 | Bridge | Notificações (alerta, lembrete) × canais (e-mail, SMS) | abstração e implementação variam sem explosão de classes |
| 08 | Composite | Permissões ou árvore de categorias com totais | folha e composto tratados uniformemente |
| 09 | Decorator | Pipeline de um repositório: cache, retry, log | decoradores empilháveis em qualquer ordem |
| 10 | Facade | Checkout orquestrando estoque, pagamento e envio | o client usa um ponto de entrada só |
| 11 | Flyweight | Ícones/estilos de mapa ou metadados de produtos repetidos | estado intrínseco compartilhado |
| 12 | Proxy | Proxy de proteção e lazy loading de um serviço caro | acesso controlado sem o client perceber |

## Comportamentais

| Dia | Padrão | Ideia de exemplo | Propriedade a testar |
|---|---|---|---|
| 13 | Chain of Responsibility | Middlewares de requisição (auth, rate limit, validação) | cada elo trata ou repassa |
| 14 | Command | Operações com undo/redo ou fila de jobs | comando desfeito restaura o estado |
| 15 | Interpreter | Mini-linguagem de regras de desconto ou filtros | gramática avaliada pela árvore de expressões |
| 16 | Iterator | Paginação por cursor sobre uma fonte em memória | percorrer sem expor a estrutura (`Symbol.iterator`/generators) |
| 17 | Mediator | Sala de chat ou coordenação de etapas de um formulário | colegas não se referenciam diretamente |
| 18 | Memento | Snapshots de um editor de configuração | restaurar sem quebrar o encapsulamento |
| 19 | Observer | Eventos de domínio com assinantes | assinantes notificados e removíveis |
| 20 | State | Ciclo de vida de um pedido (criado, pago, enviado) | transições inválidas são impossíveis |
| 21 | Strategy | Cálculo de frete ou política de retry intercambiável | trocar estratégia sem mudar o contexto |
| 22 | Template Method | Pipeline de importação (ler, validar, salvar) com passos variáveis | esqueleto fixo, passos sobrescritos |
| 23 | Visitor | Operações sobre uma AST ou árvore de documentos (exportar, contar) | nova operação sem alterar os elementos |
