import { GitHubWebhookReceiver } from './github-webhook.ts';
import { hmacSha256Hex } from './hmac.ts';
import { StripeWebhookReceiver } from './stripe-webhook.ts';
import type { WebhookReceiver } from './webhook-receiver.ts';

const nowInSeconds = () => Math.floor(Date.now() / 1000);
const stripeSecret = 'whsec_exemplo';
const githubSecret = 'segredo-do-repositorio';

// Cada provedor assina do seu jeito; aqui simulamos o lado de quem envia.
const stripeBody = JSON.stringify({ id: 'evt_1', type: 'invoice.paid' });
const timestamp = nowInSeconds();
const stripeHeaders = {
  'stripe-signature': `t=${timestamp},v1=${hmacSha256Hex(stripeSecret, `${timestamp}.${stripeBody}`)}`,
};

const githubBody = JSON.stringify({ action: 'opened', number: 42 });
const githubHeaders = { 'x-hub-signature-256': `sha256=${hmacSha256Hex(githubSecret, githubBody)}` };

// O client só conhece WebhookReceiver.receive(); a subclasse escolhe o verificador.
const deliveries: Array<[string, WebhookReceiver, string, Record<string, string>]> = [
  ['stripe', new StripeWebhookReceiver(stripeSecret, nowInSeconds), stripeBody, stripeHeaders],
  ['github', new GitHubWebhookReceiver(githubSecret), githubBody, githubHeaders],
  ['github adulterado', new GitHubWebhookReceiver(githubSecret), githubBody.replace('42', '43'), githubHeaders],
];

for (const [label, receiver, body, headers] of deliveries) {
  try {
    console.log(`[${label}] aceito:`, receiver.receive(body, headers));
  } catch (error) {
    console.log(`[${label}] rejeitado:`, (error as Error).message);
  }
}
