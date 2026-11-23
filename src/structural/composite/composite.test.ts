import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AccessGuard, ForbiddenError } from './access-guard.ts';
import type { AccessRule } from './access-rule.ts';
import { Permission } from './permission.ts';
import { Role } from './role.ts';

function hierarchy() {
  const viewer = new Role('viewer', [new Permission('orders:read'), new Permission('products:read')]);
  const editor = new Role('editor', [viewer, new Permission('orders:write')]);
  const admin = new Role('admin', [editor, new Permission('users:*')]);
  return { viewer, editor, admin };
}

describe('Composite', () => {
  it('o client trata uma permissão avulsa e um papel inteiro do mesmo jeito', () => {
    const { admin } = hierarchy();
    const leaf = new Permission('orders:read');
    const guard = new AccessGuard(new Map<string, AccessRule>([['ana', admin], ['svc', leaf]]));

    for (const rule of [admin, leaf]) {
      assert.equal(rule.grants('orders:read'), true, rule.name);
      assert.ok(rule.permissions().has('orders:read'), rule.name);
    }
    assert.equal(guard.can('ana', 'orders:read'), true);
    assert.equal(guard.can('svc', 'orders:read'), true);
    assert.equal(guard.can('svc', 'orders:write'), false);
    assert.throws(() => guard.check('svc', 'orders:write'), ForbiddenError);
    assert.equal(guard.can('desconhecido', 'orders:read'), false);
  });

  it('papéis herdam em vários níveis, só de cima para baixo', () => {
    const { viewer, editor, admin } = hierarchy();

    assert.equal(admin.grants('products:read'), true); // dois níveis abaixo
    assert.equal(editor.grants('orders:write'), true);
    assert.equal(viewer.grants('orders:write'), false);
    assert.equal(editor.grants('users:create'), false);
    assert.deepEqual([...admin.permissions()], ['orders:read', 'products:read', 'orders:write', 'users:*']);
  });

  it('o curinga vale para todas as ações de um recurso, e só dele', () => {
    const users = new Permission('users:*');

    assert.equal(users.grants('users:delete'), true);
    assert.equal(users.grants('users:create'), true);
    assert.equal(users.grants('orders:delete'), false);
    assert.equal(users.grants('users-archive:read'), false);
  });

  it('um papel compartilhado aparece uma vez só e propaga mudanças para quem o inclui', () => {
    const { viewer, editor } = hierarchy();
    const support = new Role('support', [viewer, new Permission('tickets:*')]);
    const lead = new Role('lead', [editor, support]);

    assert.equal([...lead.permissions()].filter((p) => p === 'orders:read').length, 1);

    viewer.add(new Permission('reports:read'));
    assert.equal(support.grants('reports:read'), true);
    assert.equal(lead.grants('reports:read'), true);
  });

  it('ciclos são rejeitados e a árvore continua como estava', () => {
    const { viewer, editor, admin } = hierarchy();

    assert.throws(() => viewer.add(admin), /ciclo: "admin" já inclui "viewer"/);
    assert.throws(() => editor.add(editor), /ciclo/);
    assert.equal(viewer.contains(admin), false);
    assert.equal(viewer.grants('users:create'), false);
  });

  it('remover um filho revoga o que vinha por ele; adicionar o mesmo filho de novo não duplica', () => {
    const { editor, admin } = hierarchy();

    admin.add(editor);
    assert.equal(admin.describe().filter((line) => line.includes('editor')).length, 1);

    admin.remove(editor);
    assert.equal(admin.grants('orders:write'), false);
    assert.equal(admin.grants('users:create'), true);
  });

  it('permissões em formato inválido são rejeitadas, e o pedido precisa ser uma ação concreta', () => {
    for (const invalid of ['orders', 'Orders:read', 'orders:read:all', '*:read', '']) {
      assert.throws(() => new Permission(invalid), /permissão inválida/, invalid);
    }
    const { admin } = hierarchy();
    assert.throws(() => admin.grants('users:*'), /pedido de permissão inválido/);
    assert.throws(() => new Role('vazio').grants('orders'), /pedido de permissão inválido/);
  });

  it('describe desenha a árvore inteira com a mesma chamada da folha', () => {
    const { admin } = hierarchy();

    assert.deepEqual(new Permission('orders:read').describe(), ['orders:read']);
    assert.deepEqual(admin.describe(), [
      'admin (papel)',
      '├─ editor (papel)',
      '│  ├─ viewer (papel)',
      '│  │  ├─ orders:read',
      '│  │  └─ products:read',
      '│  └─ orders:write',
      '└─ users:*',
    ]);
  });
});
