import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GitHubWebhookReceiver } from './github-webhook.ts';
import { hmacSha256Hex } from './hmac.ts';
import type { SignatureVerifier } from './signature-verifier.ts';
import { StripeWebhookReceiver } from './stripe-webhook.ts';
import { InvalidSignatureError, WebhookReceiver } from './webhook-receiver.ts';

const NOW = 1_800_000_000;
const clock = () => NOW;
const body = JSON.stringify({ id: 'evt_1', type: 'invoice.paid' });

function stripeHeaders(secret: string, timestamp: number, payload = body) {
  return { 'stripe-signature': `t=${timestamp},v1=${hmacSha256Hex(secret, `${timestamp}.${payload}`)}` };
}

function githubHeaders(secret: string, payload = body) {
  return { 'x-hub-signature-256': `sha256=${hmacSha256Hex(secret, payload)}` };
}

describe('Factory Method', () => {
  it('o mesmo receive() aceita cada provedor com o verificador que a subclasse criou', () => {
    const stripe = new StripeWebhookReceiver('s3cr3t', clock);
    const github = new GitHubWebhookReceiver('s3cr3t');

    assert.deepEqual(stripe.receive(body, stripeHeaders('s3cr3t', NOW)), JSON.parse(body));
    assert.deepEqual(github.receive(body, githubHeaders('s3cr3t')), JSON.parse(body));
  });

  it('cada subclasse rejeita o formato de assinatura do outro provedor', () => {
    const stripe = new StripeWebhookReceiver('s3cr3t', clock);
    const github = new GitHubWebhookReceiver('s3cr3t');

    assert.throws(() => stripe.receive(body, githubHeaders('s3cr3t')), InvalidSignatureError);
    assert.throws(() => github.receive(body, stripeHeaders('s3cr3t', NOW)), InvalidSignatureError);
  });

  it('uma subclasse nova estende o fluxo sem alterar o Creator, e o produto é criado uma vez só', () => {
    class AllowListReceiver extends WebhookReceiver {
      created = 0;
      protected override createVerifier(): SignatureVerifier {
        this.created += 1;
        return { verify: (_body, headers) => headers['x-token'] === 'ok' };
      }
    }
    const receiver = new AllowListReceiver();

    assert.deepEqual(receiver.receive('{"a":1}', { 'x-token': 'ok' }), { a: 1 });
    assert.throws(() => receiver.receive('{"a":1}', { 'x-token': 'nope' }), InvalidSignatureError);
    assert.equal(receiver.created, 1);
  });

  it('rejeita corpo adulterado, segredo errado e cabeçalho ausente', () => {
    const github = new GitHubWebhookReceiver('s3cr3t');

    assert.throws(() => github.receive(body.replace('paid', 'void'), githubHeaders('s3cr3t')), InvalidSignatureError);
    assert.throws(() => github.receive(body, githubHeaders('outro')), InvalidSignatureError);
    assert.throws(() => github.receive(body, {}), InvalidSignatureError);
  });

  it('Stripe rejeita timestamp fora da janela de 5 minutos (replay)', () => {
    const stripe = new StripeWebhookReceiver('s3cr3t', clock);

    assert.ok(stripe.receive(body, stripeHeaders('s3cr3t', NOW - 300)));
    assert.throws(() => stripe.receive(body, stripeHeaders('s3cr3t', NOW - 301)), InvalidSignatureError);
  });

  it('Stripe aceita qualquer v1 válido durante a rotação de segredos', () => {
    const stripe = new StripeWebhookReceiver('novo', clock);
    const signature = hmacSha256Hex('novo', `${NOW}.${body}`);
    const headers = { 'stripe-signature': `t=${NOW},v1=${hmacSha256Hex('antigo', `${NOW}.${body}`)},v1=${signature}` };

    assert.ok(stripe.receive(body, headers));
  });
});
