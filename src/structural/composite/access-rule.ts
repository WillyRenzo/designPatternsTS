// Component: o que uma permissão avulsa e um papel inteiro têm em comum. Quem
// autoriza recebe um AccessRule e não precisa saber se é folha ou árvore.
export interface AccessRule {
  readonly name: string;
  grants(permission: string): boolean;
  // Permissões efetivas, já achatadas e sem repetição.
  permissions(): ReadonlySet<string>;
  contains(rule: AccessRule): boolean;
  describe(): string[];
}
