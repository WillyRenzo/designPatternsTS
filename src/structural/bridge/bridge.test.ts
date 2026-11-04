import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EmailChannel } from './channels/email-channel.ts';
import { SlackChannel } from './channels/slack-channel.ts';
import { SMS_MAX_LENGTH, SmsChannel } from './channels/sms-channel.ts';
import { type Incident, IncidentAlert } from './incident-alert.ts';
import { InvoiceReminder } from './invoice-reminder.ts';
import type { ChannelMessage, Contact, MessageChannel } from './message-channel.ts';
import { Notification } from './notification.ts';

const ana: Contact = { name: 'Ana', email: 'ana@acme.dev', phone: '+5511990000001', slackUserId: 'U01ANA' };

const incident: Incident = {
  service: 'payments-api',
  severity: 'critical',
  summary: 'latência alta',
  runbookUrl: 'https://runbooks.acme.dev/payments-api',
};

// Cada canal concreto, com o endereço que ele deve usar e o texto que entregou.
interface ChannelUnderTest {
  readonly channel: MessageChannel;
  readonly address: string;
  delivered(): string[];
}
const channels: Array<() => ChannelUnderTest> = [
  () => {
    const c = new EmailChannel();
    return { channel: c, address: ana.email, delivered: () => c.outbox.map((m) => `${m.to} ${m.subject} ${m.text}`) };
  },
  () => {
    const c = new SmsChannel();
    return { channel: c, address: ana.phone, delivered: () => c.outbox.map((m) => `${m.to} ${m.text}`) };
  },
  () => {
    const c = new SlackChannel();
    return { channel: c, address: ana.slackUserId, delivered: () => c.outbox.map((m) => `${m.channel} ${m.text}`) };
  },
];

// Cada notificação refinada, com o que precisa aparecer na mensagem.
const notifications = [
  { name: 'IncidentAlert', send: (ch: MessageChannel) => new IncidentAlert(ch).raise([ana], incident), expected: 'payments-api' },
  {
    name: 'InvoiceReminder',
    send: (ch: MessageChannel) => new InvoiceReminder(ch).remind(ana, { id: 'F-1', amountCents: 8990, daysUntilDue: 3 }),
    expected: 'F-1',
  },
] as const;

// Canal que só registra a mensagem primitiva, para observar o que a abstração decide.
function recordingChannel(): MessageChannel & { readonly received: ChannelMessage[] } {
  const received: ChannelMessage[] = [];
  return { name: 'recording', received, send: (message) => void received.push(message) };
}

describe('Bridge', () => {
  it('2 notificações e 3 canais (5 classes) cobrem as 6 combinações', () => {
    for (const notification of notifications) {
      for (const make of channels) {
        const { channel, address, delivered: read } = make();
        notification.send(channel);

        const delivered = read();
        assert.equal(delivered.length, 1, `${notification.name} via ${channel.name}`);
        assert.ok(delivered[0]?.includes(address), `${notification.name} via ${channel.name} usa o endereço do canal`);
        assert.ok(delivered[0]?.includes(notification.expected), `${notification.name} via ${channel.name} leva o conteúdo`);
      }
    }
  });

  it('um canal novo funciona com as notificações existentes sem alterá-las', () => {
    const channel = recordingChannel();

    new IncidentAlert(channel).raise([ana], incident);
    new IncidentAlert(channel).raise([ana], { ...incident, severity: 'warning' });
    new InvoiceReminder(channel).remind(ana, { id: 'F-1', amountCents: 8990, daysUntilDue: 3 });
    new InvoiceReminder(channel).remind(ana, { id: 'F-2', amountCents: 8990, daysUntilDue: -1 });

    assert.deepEqual(
      channel.received.map((m) => [m.title, m.urgent]),
      [
        ['[CRÍTICO] payments-api: latência alta', true],
        ['[ATENÇÃO] payments-api: latência alta', false],
        ['Fatura F-1 vence em 3 dias', false],
        ['Fatura F-2 venceu há 1 dia', true],
      ],
    );
  });

  it('uma notificação nova funciona com os canais existentes sem alterá-los', () => {
    class PasswordResetNotice extends Notification {
      send(to: Contact, code: string): void {
        this.deliver(to, 'Código de redefinição de senha', `Seu código é ${code}. Ele expira em 10 minutos.`, true);
      }
    }
    const email = new EmailChannel();
    const sms = new SmsChannel();

    new PasswordResetNotice(email).send(ana, '482913');
    new PasswordResetNotice(sms).send(ana, '482913');

    assert.equal(email.outbox[0]?.subject, '[URGENTE] Código de redefinição de senha');
    assert.match(sms.outbox[0]?.text ?? '', /^URGENTE: Código de redefinição de senha\. Seu código é 482913/);
  });

  it('as regras de formato ficam no canal: SMS corta no limite, e-mail e Slack recebem o texto inteiro', () => {
    const longIncident = { ...incident, summary: 'x'.repeat(300) };
    const email = new EmailChannel();
    const sms = new SmsChannel();
    const slack = new SlackChannel();

    for (const channel of [email, sms, slack]) new IncidentAlert(channel).raise([ana], longIncident);

    const smsText = sms.outbox[0]?.text ?? '';
    assert.equal(smsText.length, SMS_MAX_LENGTH);
    assert.ok(smsText.endsWith('...'));
    assert.ok(email.outbox[0]?.subject.includes(longIncident.summary));
    assert.equal(slack.outbox[0]?.text, `:rotating_light: *[CRÍTICO] payments-api: ${longIncident.summary}*\nRunbook: ${incident.runbookUrl}`);
  });

  it('o lembrete formata prazo e valor sem ponto flutuante, independente do canal', () => {
    const channel = recordingChannel();
    const reminder = new InvoiceReminder(channel);

    reminder.remind(ana, { id: 'F-1', amountCents: 123456, daysUntilDue: 0 });
    reminder.remind(ana, { id: 'F-2', amountCents: 29, daysUntilDue: 1 });
    reminder.remind(ana, { id: 'F-3', amountCents: 100000000, daysUntilDue: -3 });

    assert.deepEqual(
      channel.received.map((m) => [m.title, m.body]),
      [
        ['Fatura F-1 vence hoje', 'Olá, Ana. O valor da fatura F-1 é R$ 1.234,56.'],
        ['Fatura F-2 vence em 1 dia', 'Olá, Ana. O valor da fatura F-2 é R$ 0,29.'],
        ['Fatura F-3 venceu há 3 dias', 'Olá, Ana. O valor da fatura F-3 é R$ 1.000.000,00.'],
      ],
    );
  });

  it('o mesmo alerta vai para todo o plantão, e plantão vazio é erro', () => {
    const bruno: Contact = { ...ana, name: 'Bruno', slackUserId: 'U02BRUNO' };
    const slack = new SlackChannel();

    new IncidentAlert(slack).raise([ana, bruno], incident);

    assert.deepEqual(slack.outbox.map((m) => m.channel), ['U01ANA', 'U02BRUNO']);
    assert.throws(() => new IncidentAlert(slack).raise([], incident), /sem ninguém de plantão/);
  });
});
