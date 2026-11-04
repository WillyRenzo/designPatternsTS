import { EmailChannel } from './channels/email-channel.ts';
import { SlackChannel } from './channels/slack-channel.ts';
import { SmsChannel } from './channels/sms-channel.ts';
import { type Incident, IncidentAlert } from './incident-alert.ts';
import { InvoiceReminder } from './invoice-reminder.ts';
import type { Contact } from './message-channel.ts';

const ana: Contact = { name: 'Ana', email: 'ana@acme.dev', phone: '+5511990000001', slackUserId: 'U01ANA' };
const bruno: Contact = { name: 'Bruno', email: 'bruno@acme.dev', phone: '+5511990000002', slackUserId: 'U02BRUNO' };
const carla: Contact = { name: 'Carla', email: 'carla@cliente.com', phone: '+5521990000003', slackUserId: 'U03CARLA' };

const email = new EmailChannel();
const sms = new SmsChannel();
const slack = new SlackChannel();

// Composição: cada notificação recebe o canal na construção. As duas
// hierarquias se combinam aqui, sem uma classe por combinação.
const incident: Incident = {
  service: 'payments-api',
  severity: 'critical',
  summary: 'latência p99 acima de 2s há 5 minutos em todas as regiões, com timeouts no checkout',
  runbookUrl: 'https://runbooks.acme.dev/payments-api/latencia',
};
new IncidentAlert(slack).raise([ana, bruno], incident);
new IncidentAlert(sms).raise([ana], incident); // escalonamento: o mesmo alerta, outro canal

new InvoiceReminder(email).remind(carla, { id: 'F-2026-0042', amountCents: 123456, daysUntilDue: 3 });
new InvoiceReminder(sms).remind(carla, { id: 'F-2026-0031', amountCents: 8990, daysUntilDue: -2 });

for (const channel of [slack, sms, email]) {
  console.log(`--- ${channel.name} ---`);
  for (const message of channel.outbox) console.log(message);
}
