import type { AccessRule } from './access-rule.ts';
import { assertConcrete } from './permission.ts';

// Composite: um papel agrupa permissões e outros papéis. Cada operação do
// Component é repassada aos filhos e o resultado é combinado.
export class Role implements AccessRule {
  readonly name: string;
  readonly #children: AccessRule[] = [];

  constructor(name: string, children: readonly AccessRule[] = []) {
    this.name = name;
    for (const child of children) this.add(child);
  }

  // add/remove só existem no Composite (opção "segura" do livro, ver README).
  add(child: AccessRule): this {
    if (child.contains(this)) throw new Error(`ciclo: "${child.name}" já inclui "${this.name}"`);
    if (!this.#children.includes(child)) this.#children.push(child);
    return this;
  }

  remove(child: AccessRule): this {
    const index = this.#children.indexOf(child);
    if (index !== -1) this.#children.splice(index, 1);
    return this;
  }

  grants(permission: string): boolean {
    assertConcrete(permission);
    return this.#children.some((child) => child.grants(permission));
  }

  permissions(): ReadonlySet<string> {
    const all = new Set<string>();
    for (const child of this.#children) {
      for (const permission of child.permissions()) all.add(permission);
    }
    return all;
  }

  contains(rule: AccessRule): boolean {
    return rule === this || this.#children.some((child) => child.contains(rule));
  }

  describe(): string[] {
    const lines = [`${this.name} (papel)`];
    this.#children.forEach((child, index) => {
      const last = index === this.#children.length - 1;
      const [head = '', ...rest] = child.describe();
      lines.push(`${last ? '└─ ' : '├─ '}${head}`);
      for (const line of rest) lines.push(`${last ? '   ' : '│  '}${line}`);
    });
    return lines;
  }
}
