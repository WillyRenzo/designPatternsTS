import { EmailTemplate } from './email-template.ts';
import { SmsTemplate } from './sms-template.ts';
import { TemplateRegistry } from './template-registry.ts';

// Composição: os únicos pontos que conhecem as classes concretas são os registros iniciais.
const registry = new TemplateRegistry();
registry.register(
  'welcome-email',
  new EmailTemplate({
    from: 'ola@loja.example',
    subject: 'Bem-vindo(a), {{name}}!',
    body: 'Oi {{name}}, sua conta está pronta.',
    tags: ['onboarding'],
  }),
);
registry.register(
  'payment-due-sms',
  new SmsTemplate({ senderId: 'LOJA', text: 'Sua fatura de {{amount}} vence amanhã.', tags: ['billing'] }),
);

// Um "tipo" novo de template sem classe nova: clona um protótipo, ajusta e registra.
const vip = registry.create('welcome-email');
vip.addTag('vip');
registry.register('welcome-email-vip', vip);

// Client: só conhece a chave e a interface NotificationTemplate.
const sends: Array<[string, string, Record<string, string>]> = [
  ['welcome-email', 'ana@example.com', { name: 'Ana' }],
  ['welcome-email-vip', 'bruno@example.com', { name: 'Bruno' }],
  ['payment-due-sms', '+5511999990000', { amount: 'R$ 89,90' }],
];

for (const [key, recipient, variables] of sends) {
  const template = registry.create(key);
  template.fill(variables);
  console.log(`[${key}]`, template.render(recipient));
}

console.log('[protótipo intacto]', registry.create('welcome-email').render('-'));
