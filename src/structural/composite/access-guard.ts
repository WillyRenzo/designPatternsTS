import type { AccessRule } from './access-rule.ts';

export class ForbiddenError extends Error {
  override readonly name = 'ForbiddenError';
}

// Client: autoriza pelo AccessRule de cada principal. Um usuário com o papel
// admin e uma conta de serviço com uma única permissão passam pelo mesmo código.
export class AccessGuard {
  readonly #rules: ReadonlyMap<string, AccessRule>;

  constructor(rules: ReadonlyMap<string, AccessRule>) {
    this.#rules = rules;
  }

  can(principal: string, permission: string): boolean {
    return this.#rules.get(principal)?.grants(permission) ?? false;
  }

  check(principal: string, permission: string): void {
    if (!this.can(principal, permission)) throw new ForbiddenError(`${principal} não tem ${permission}`);
  }
}
