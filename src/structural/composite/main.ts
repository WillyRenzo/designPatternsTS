import { AccessGuard } from './access-guard.ts';
import type { AccessRule } from './access-rule.ts';
import { Permission } from './permission.ts';
import { Role } from './role.ts';

// A árvore: viewer ⊂ editor ⊂ admin, e viewer compartilhado com support.
const viewer = new Role('viewer', [new Permission('orders:read'), new Permission('products:read')]);
const editor = new Role('editor', [viewer, new Permission('orders:write')]);
const support = new Role('support', [viewer, new Permission('tickets:*')]);
const admin = new Role('admin', [editor, new Permission('users:*')]);

console.log(admin.describe().join('\n'));
console.log('\npermissões efetivas do admin:', [...admin.permissions()]);

// O guard recebe folhas e compostos misturados, sem distinguir.
const rules = new Map<string, AccessRule>([
  ['ana', admin],
  ['bruno', support],
  ['svc-relatorios', new Permission('orders:read')],
]);
const guard = new AccessGuard(rules);

console.log();
for (const [principal, permission] of [
  ['ana', 'users:delete'],
  ['bruno', 'tickets:close'],
  ['bruno', 'orders:write'],
  ['svc-relatorios', 'orders:read'],
  ['svc-relatorios', 'products:read'],
] as const) {
  console.log(`${principal.padEnd(15)} ${permission.padEnd(14)} → ${guard.can(principal, permission) ? 'permitido' : 'negado'}`);
}

// Mudar um nó compartilhado vale para todos os papéis que o incluem.
viewer.add(new Permission('reports:read'));
console.log('\ndepois de dar reports:read ao viewer:');
console.log('  support', guard.can('bruno', 'reports:read'), '| admin', guard.can('ana', 'reports:read'));

try {
  viewer.add(admin);
} catch (error) {
  console.log('\nviewer.add(admin) →', (error as Error).message);
}
