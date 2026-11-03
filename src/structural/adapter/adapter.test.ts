import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CheckoutService } from './checkout-service.ts';
import { LegacyBankAdapter } from './legacy-bank-adapter.ts';
import { PayFastAdapter } from './payfast-adapter.ts';
import { type DeclineReason, GatewayUnavailableError, type PaymentGateway } from './payment-gateway.ts';
import { LegacyBankGateway } from './vendors/legacy-bank-gateway.ts';
import { PayFastClient } from './vendors/payfast-client.ts';

// Cada provedor sinaliza o mesmo resultado de um jeito; o adapter deve chegar ao mesmo status.
const cases: Array<{ provider: string; gateway: () => PaymentGateway; tokens: Record<'approved' | DeclineReason, string> }> = [
  {
    provider: 'payfast',
    gateway: () => new PayFastAdapter(new PayFastClient()),
    tokens: {
      approved: 'tok_visa',
      insufficient_funds: 'tok_insufficient',
      card_expired: 'tok_expired',
      fraud_suspected: 'tok_fraud',
      unknown: '',
    },
  },
  {
    provider: 'legacy-bank',
    gateway: () => new LegacyBankAdapter(new LegacyBankGateway()),
    tokens: {
      approved: '4111111111111111',
      insufficient_funds: '4111111111110051',
      card_expired: '4111111111110054',
      fraud_suspected: '4111111111110059',
      unknown: '',
    },
  },
];

const order = { orderId: 'A-1', amountCents: 8990 };

describe('Adapter', () => {
  for (const { provider, gateway, tokens } of cases) {
    it(`${provider}: o checkout recebe os status padronizados do Target`, async () => {
      const checkout = new CheckoutService([gateway()]);

      const approved = await checkout.pay({ ...order, cardToken: tokens.approved });
      assert.equal(approved.result.status, 'approved');
      assert.equal(approved.gateway, provider);

      for (const reason of ['insufficient_funds', 'card_expired', 'fraud_suspected'] as const) {
        const { result } = await checkout.pay({ ...order, orderId: `R-${reason}`, cardToken: tokens[reason] });
        assert.deepEqual(result, { status: 'declined', reason });
      }
    });
  }

  it('o adapter do banco legado converte centavos para o formato "reais,centavos" sem ponto flutuante', async () => {
    const sent: string[] = [];
    class SpyBank extends LegacyBankGateway {
      override autorizar(valor: string, numeroCartao: string, pedido: string): string {
        sent.push(valor);
        return super.autorizar(valor, numeroCartao, pedido);
      }
    }
    const adapter = new LegacyBankAdapter(new SpyBank());

    for (const cents of [8990, 5, 29, 100, 123456]) {
      await adapter.charge({ orderId: 'A-1', amountCents: cents, cardToken: '4111111111111111' });
    }
    assert.deepEqual(sent, ['89,90', '0,05', '0,29', '1,00', '1234,56']);
  });

  it('com o primeiro provedor fora do ar, o checkout usa o próximo', async () => {
    const checkout = new CheckoutService([
      new PayFastAdapter(new PayFastClient()),
      new LegacyBankAdapter(new LegacyBankGateway()),
    ]);

    const outcome = await checkout.pay({ ...order, cardToken: 'tok_unavailable' });
    assert.equal(outcome.gateway, 'legacy-bank');
    assert.equal(outcome.result.status, 'approved');
  });

  it('recusa e erro de formato não acionam o próximo provedor; todos fora do ar vira GatewayUnavailableError', async () => {
    const legacyCalls: string[] = [];
    class CountingBank extends LegacyBankGateway {
      override autorizar(valor: string, numeroCartao: string, pedido: string): string {
        legacyCalls.push(pedido);
        return super.autorizar(valor, numeroCartao, pedido);
      }
    }
    const declined = new CheckoutService([new PayFastAdapter(new PayFastClient()), new LegacyBankAdapter(new CountingBank())]);
    assert.equal((await declined.pay({ ...order, cardToken: 'tok_fraud' })).result.status, 'declined');
    assert.deepEqual(legacyCalls, []);

    const malformed = new CheckoutService([new LegacyBankAdapter(new LegacyBankGateway()), new PayFastAdapter(new PayFastClient())]);
    await assert.rejects(malformed.pay({ ...order, orderId: '', cardToken: '4111111111111111' }), (error: Error) => {
      return !(error instanceof GatewayUnavailableError) && /formato inválido/.test(error.message);
    });

    const allDown = new CheckoutService([new PayFastAdapter(new PayFastClient()), new LegacyBankAdapter(new LegacyBankGateway())]);
    await assert.rejects(allDown.pay({ ...order, cardToken: 'tok_unavailable0091' }), GatewayUnavailableError);
  });

  it('o adapter da PayFast usa o pedido como chave de idempotência: retry não cobra duas vezes', async () => {
    const adapter = new PayFastAdapter(new PayFastClient());

    const first = await adapter.charge({ ...order, cardToken: 'tok_visa' });
    const retry = await adapter.charge({ ...order, cardToken: 'tok_visa' });
    const otherOrder = await adapter.charge({ ...order, orderId: 'A-2', cardToken: 'tok_visa' });

    assert.deepEqual(retry, first);
    assert.notDeepEqual(otherOrder, first);
  });

  it('o checkout rejeita valores que não são centavos inteiros e positivos', async () => {
    const checkout = new CheckoutService([new PayFastAdapter(new PayFastClient())]);

    await assert.rejects(checkout.pay({ ...order, amountCents: 89.9, cardToken: 'tok_visa' }), /valor inválido/);
    await assert.rejects(checkout.pay({ ...order, amountCents: 0, cardToken: 'tok_visa' }), /valor inválido/);
  });
});
