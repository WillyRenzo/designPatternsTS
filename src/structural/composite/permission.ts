import type { AccessRule } from './access-rule.ts';

const RULE_FORMAT = /^[a-z][a-z-]*:([a-z][a-z-]*|\*)$/;
const REQUEST_FORMAT = /^[a-z][a-z-]*:[a-z][a-z-]*$/;

// Leaf: uma permissão no formato "recurso:ação". A ação "*" vale para todas
// as ações do recurso.
export class Permission implements AccessRule {
  readonly name: string;
  readonly #resource: string;
  readonly #action: string;

  constructor(rule: string) {
    if (!RULE_FORMAT.test(rule)) throw new Error(`permissão inválida: "${rule}" (use "recurso:ação" ou "recurso:*")`);
    const [resource = '', action = ''] = rule.split(':');
    this.name = rule;
    this.#resource = resource;
    this.#action = action;
  }

  grants(permission: string): boolean {
    assertConcrete(permission);
    const [resource, action] = permission.split(':');
    return resource === this.#resource && (this.#action === '*' || action === this.#action);
  }

  permissions(): ReadonlySet<string> {
    return new Set([this.name]);
  }

  contains(rule: AccessRule): boolean {
    return rule === this;
  }

  describe(): string[] {
    return [this.name];
  }
}

// O pedido é sempre uma ação concreta: "orders:*" só faz sentido como regra.
export function assertConcrete(permission: string): void {
  if (!REQUEST_FORMAT.test(permission)) throw new Error(`pedido de permissão inválido: "${permission}"`);
}
