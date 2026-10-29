import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EmailTemplate } from './email-template.ts';
import { SmsTemplate } from './sms-template.ts';
import { TemplateRegistry } from './template-registry.ts';

function welcomeEmail() {
  return new EmailTemplate({
    from: 'ola@loja.example',
    subject: 'Oi, {{name}}',
    body: 'Conta pronta, {{name}}.',
    tags: ['onboarding'],
  });
}

describe('Prototype', () => {
  it('o clone é independente: preencher e marcar o clone não altera o protótipo', () => {
    const prototype = welcomeEmail();
    const before = prototype.render('x');

    const copy = prototype.clone();
    copy.fill({ name: 'Ana' });
    copy.addTag('vip');

    assert.deepEqual(prototype.render('x'), before);
    assert.equal(copy.render('x').subject, 'Oi, Ana');
    assert.deepEqual(copy.render('x').tags, ['onboarding', 'vip']);
  });

  it('o registro entrega um objeto novo a cada pedido, da mesma classe do protótipo', () => {
    const registry = new TemplateRegistry();
    registry.register('welcome', welcomeEmail());
    registry.register('due', new SmsTemplate({ senderId: 'LOJA', text: 'Vence {{date}}' }));

    const first = registry.create('welcome');
    const second = registry.create('welcome');
    assert.notEqual(first, second);
    assert.ok(first instanceof EmailTemplate);
    assert.ok(registry.create('due') instanceof SmsTemplate);
  });

  it('o registro guarda uma cópia, então mexer no objeto registrado depois não muda o protótipo', () => {
    const registry = new TemplateRegistry();
    const original = welcomeEmail();
    registry.register('welcome', original);

    original.addTag('alterado-depois');

    assert.deepEqual(registry.create('welcome').render('x').tags, ['onboarding']);
  });

  it('um protótipo derivado (clone + ajuste) vira um template novo sem classe nova', () => {
    const registry = new TemplateRegistry();
    registry.register('welcome', welcomeEmail());
    const vip = registry.create('welcome');
    vip.addTag('vip');
    registry.register('welcome-vip', vip);

    assert.deepEqual(registry.create('welcome-vip').render('x').tags, ['onboarding', 'vip']);
    assert.deepEqual(registry.create('welcome').render('x').tags, ['onboarding']);
  });

  it('structuredClone não serve como clone(): perde a classe, os métodos e os campos #private', () => {
    const copy: unknown = structuredClone(welcomeEmail());

    assert.equal(copy instanceof EmailTemplate, false);
    assert.deepEqual(copy, {});
  });

  it('falha com variável ausente e com chave desconhecida', () => {
    const registry = new TemplateRegistry();
    registry.register('welcome', welcomeEmail());

    assert.throws(() => registry.create('welcome').fill({}), /variável do template não informada: name/);
    assert.throws(() => registry.create('nao-existe'), /template não registrado: nao-existe/);
  });
});
