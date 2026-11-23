# Composite

> **Categoria:** estrutural · **Escopo:** objeto · **Dia:** 08 (23/11/2026)

## Intenção

Compor objetos em estruturas de árvore para representar hierarquias
parte-todo. O Composite permite que os clients tratem objetos individuais e
composições de objetos de maneira uniforme.

## O exemplo

Controle de acesso por papéis (RBAC). Uma **permissão** (`orders:read`,
`users:*`) é a peça indivisível; um **papel** agrupa permissões e outros papéis.
Quem autoriza (`AccessGuard`) recebe, para cada principal, um `AccessRule`, que
pode ser o papel `admin` inteiro ou uma única permissão dada a uma conta de
serviço, e chama `grants()` sem saber qual dos dois tem na mão.

```
admin (papel)                         AccessGuard ──► AccessRule (Component)
├─ editor (papel)                       (Client)       grants(), permissions(),
│  ├─ viewer (papel)  ◄── também em                     contains(), describe()
│  │  ├─ orders:read      "support"                        ▲            ▲
│  │  └─ products:read                                     │            │
│  └─ orders:write                               Permission (Leaf)  Role (Composite)
└─ users:*                                                          #children: AccessRule[]
```

`admin.grants('products:read')` desce dois níveis: o `admin` pergunta aos
filhos, o `editor` pergunta aos dele, e a folha `products:read` responde. O
mesmo vale para `permissions()` (união das folhas), `contains()` e `describe()`
(o desenho acima é a saída dele).

| Participante (livro) | Neste exemplo |
|---|---|
| Component | `AccessRule` ([access-rule.ts](access-rule.ts)) |
| Leaf | `Permission` ([permission.ts](permission.ts)) |
| Composite | `Role` ([role.ts](role.ts)) |
| Client | `AccessGuard` ([access-guard.ts](access-guard.ts)) |

## Aplicabilidade

Use quando:

- você quer representar hierarquias parte-todo (papéis dentro de papéis);
- você quer que os clients ignorem a diferença entre composições e objetos
  individuais: o guard trata `admin` e `orders:read` do mesmo jeito.

## Consequências

| | |
|---|---|
| ✅ Client simples | `AccessGuard.can()` é uma linha; não há `if (rule instanceof Role)` em lugar nenhum fora da árvore. |
| ✅ Novos tipos de nó entram sem mudar o client | Uma regra com horário ou com condição de tenant só precisa implementar `AccessRule`. |
| ✅ Nós compartilhados | `viewer` está dentro de `editor` e de `support`. Dar uma permissão ao `viewer` vale para os dois, porque a árvore guarda referências, não cópias. |
| ❌ Projeto genérico demais | O tipo não impede regras de negócio como "papel de suporte não pode incluir `users:*`". Isso exige checagem em runtime no `add`. |
| ❌ Recursão sem guarda | Com nós compartilhados, a "árvore" vira um grafo, e um ciclo (`viewer` incluindo `admin`) faz `grants()` estourar com `RangeError: Maximum call stack size exceeded` (verificado desligando a checagem). Por isso `add` rejeita ciclos com `contains()`. |

## Notas de implementação (TypeScript)

- **Transparência × segurança.** O livro discute onde declarar `add`/`remove`.
  No Component, eles dão transparência: toda folha "aceita" filhos, mas falha
  em runtime. No Composite, dão segurança, porque o compilador impede
  `permission.add()`. Escolhemos a segurança: `add`/`remove` só existem em
  `Role`. Em C++ isso costuma exigir um `GetComposite()` para descobrir se o nó
  é composto; em TS o client nem precisa disso, porque quem monta a árvore
  (`main.ts`) já tem o tipo `Role` na mão.
- **Component como interface.** No livro, `Component` é uma classe abstrata com
  implementações padrão de `Add`/`Remove`. Sem nada para herdar, uma
  `interface` basta, e qualquer objeto com os quatro métodos vira um nó.
- **Sem referência ao pai.** O livro sugere guardar o pai em cada filho para
  subir na árvore. Como aqui um nó pode ter vários pais (`viewer`), uma
  referência única não faria sentido. A detecção de ciclo desce a partir do
  filho (`child.contains(this)`) em vez de subir.
- **Filhos privados.** `#children` não aparece para fora do `Role`. O resto do
  código vê só as operações do Component, e `permissions()` devolve um `Set`
  novo, sem expor a estrutura interna.
- **`this` como retorno** (`add(): this`) permite encadear `role.add(a).add(b)`
  e continua correto em subclasses de `Role`.
- **Simplificação do exemplo:** sem cache. Cada `grants()` percorre a
  subárvore. Num sistema real, as permissões efetivas de um papel costumam ser
  achatadas e guardadas, com invalidação quando a árvore muda.

## Padrões relacionados

- **Decorator:** costuma ser usado com o Composite, e os dois têm a mesma
  interface do componente. Mas o Decorator tem um único filho e acrescenta
  comportamento; o Composite tem vários e agrega resultados.
- **Iterator:** pode percorrer a árvore sem expor `#children`.
- **Visitor:** concentra operações que, sem ele, ficariam espalhadas por Leaf e
  Composite (por exemplo, exportar a árvore de papéis em outro formato).
- **Flyweight:** permite compartilhar folhas. Aqui, `Permission('orders:read')`
  poderia ser uma instância única reutilizada por todos os papéis.
- **Chain of Responsibility:** usa a ligação filho → pai para repassar pedidos.

## Rodando

```bash
docker compose run --rm node npm run demo -- composite
docker compose run --rm node node --test src/structural/composite/composite.test.ts
```

Os testes provam: o guard trata uma permissão avulsa e um papel inteiro da
mesma forma; papéis herdam em vários níveis e só de cima para baixo; o curinga
`recurso:*` vale para todas as ações daquele recurso e de nenhum outro; um papel
compartilhado aparece uma vez só nas permissões efetivas e propaga mudanças para
todos que o incluem; ciclos (inclusive um papel dentro de si mesmo) são
rejeitados sem alterar a árvore; remover um filho revoga o que vinha por ele e
adicionar o mesmo filho de novo não duplica; formatos inválidos são rejeitados;
e `describe()` desenha a árvore inteira com a mesma chamada da folha.
