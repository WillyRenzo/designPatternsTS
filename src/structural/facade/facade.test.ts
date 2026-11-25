import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CheckoutError, CheckoutFacade, type CheckoutFailure, type CheckoutRequest } from './checkout-facade.ts';
import { Inventory, OutOfStockError } from './subsystem/inventory.ts';
import { Mailer } from './subsystem/mailer.ts';
import { PaymentDeclinedError, PaymentProcessor } from './subsystem/payment-processor.ts';
import { ProductCatalog } from './subsystem/product-catalog.ts';
import { FLAT_RATE_CENTS, ShippingService } from './subsystem/shipping-service.ts';

function setup() {
  const subsystem = {
    catalog: new ProductCatalog({
      'kbd-01': { name: 'Teclado', priceCents: 34990 },
      'mouse-01': { name: 'Mouse', priceCents: 12990 },
    }),
    inventory: new Inventory({ 'kbd-01': 2, 'mouse-01': 10 }),
    payments: new PaymentProcessor(),
    shipping: new ShippingService(),
    mailer: new Mailer(),
  };
  return { subsystem, checkout: new CheckoutFacade(subsystem) };
}

const order: CheckoutRequest = {
  customerEmail: 'carla@cliente.com',
  items: [{ sku: 'mouse-01', quantity: 2 }],
  zip: '01310-100',
  cardToken: 'tok_visa',
};

// Uma foto do estado de todos os subsistemas, para provar que uma falha não deixa rastro.
function snapshot({ subsystem }: ReturnType<typeof setup>) {
  return {
    stock: [subsystem.inventory.available('kbd-01'), subsystem.inventory.available('mouse-01')],
    activeCharges: subsystem.payments.charges.filter((c) => !c.refunded).length,
    labels: subsystem.shipping.labels.length,
    emails: subsystem.mailer.outbox.length,
  };
}

function rejectsWith(reason: CheckoutFailure) {
  return (error: unknown) => error instanceof CheckoutError && error.reason === reason;
}

describe('Facade', () => {
  it('uma chamada ao placeOrder coordena catálogo, estoque, pagamento, frete e e-mail', () => {
    const env = setup();

    const receipt = env.checkout.placeOrder(order);

    assert.deepEqual(receipt, {
      orderId: 'order-1',
      subtotalCents: 25980,
      shippingCents: FLAT_RATE_CENTS,
      totalCents: 25980 + FLAT_RATE_CENTS,
      trackingCode: 'BR000000001',
      confirmationSent: true,
    });
    assert.equal(env.subsystem.inventory.available('mouse-01'), 8);
    assert.deepEqual(env.subsystem.payments.charges, [{ id: 'ch_1', amountCents: receipt.totalCents, refunded: false }]);
    assert.deepEqual(env.subsystem.shipping.labels, [{ orderId: 'order-1', trackingCode: 'BR000000001' }]);
    assert.equal(env.subsystem.mailer.outbox[0]?.subject, 'Pedido order-1 confirmado');
  });

  it('frete grátis a partir de R$ 300,00, com o preço vindo do catálogo', () => {
    const { checkout } = setup();

    const receipt = checkout.placeOrder({ ...order, items: [{ sku: 'kbd-01', quantity: 1 }] });

    assert.equal(receipt.subtotalCents, 34990);
    assert.equal(receipt.shippingCents, 0);
  });

  it('cartão recusado: a reserva de estoque é liberada e nada mais acontece', () => {
    const env = setup();
    const before = snapshot(env);

    assert.throws(() => env.checkout.placeOrder({ ...order, cardToken: 'tok_declined' }), rejectsWith('payment_declined'));
    assert.deepEqual(snapshot(env), before);
  });

  it('transportadora fora do ar depois da cobrança: estorna o pagamento e libera o estoque', () => {
    const env = setup();
    const before = snapshot(env);

    assert.throws(() => env.checkout.placeOrder({ ...order, zip: '99010-000' }), rejectsWith('shipping_unavailable'));
    assert.deepEqual(snapshot(env), before);
    assert.deepEqual(env.subsystem.payments.charges.map((c) => c.refunded), [true]);
  });

  it('falhas antes de mudar estado não deixam rastro: estoque, CEP, produto e carrinho', () => {
    const env = setup();
    const before = snapshot(env);
    const cases: Array<[CheckoutFailure, Partial<CheckoutRequest>]> = [
      ['out_of_stock', { items: [{ sku: 'kbd-01', quantity: 1 }, { sku: 'kbd-01', quantity: 2 }] }], // soma as linhas repetidas
      ['invalid_address', { zip: '1310' }],
      ['unknown_product', { items: [{ sku: 'cadeira-01', quantity: 1 }] }],
      ['invalid_cart', { items: [] }],
      ['invalid_cart', { items: [{ sku: 'mouse-01', quantity: 0 }] }],
      ['invalid_cart', { items: [{ sku: 'mouse-01', quantity: 1.5 }] }],
    ];

    for (const [reason, change] of cases) {
      assert.throws(() => env.checkout.placeOrder({ ...order, ...change }), rejectsWith(reason), reason);
    }
    assert.deepEqual(snapshot(env), before);
  });

  it('o client só conhece CheckoutError; o erro do subsistema fica em cause', () => {
    const { checkout } = setup();

    for (const [change, original] of [
      [{ cardToken: 'tok_declined' }, PaymentDeclinedError],
      [{ items: [{ sku: 'kbd-01', quantity: 3 }] }, OutOfStockError],
    ] as const) {
      assert.throws(
        () => checkout.placeOrder({ ...order, ...change }),
        (error: unknown) => error instanceof CheckoutError && error.cause instanceof original,
      );
    }
  });

  it('e-mail é melhor esforço: um bounce não desfaz um pedido pago', () => {
    const env = setup();

    const receipt = env.checkout.placeOrder({ ...order, customerEmail: 'carla@invalid' });

    assert.equal(receipt.confirmationSent, false);
    assert.equal(env.subsystem.shipping.labels.length, 1);
    assert.equal(env.subsystem.payments.charges[0]?.refunded, false);
  });

  it('a fachada não tranca o subsistema: as classes continuam usáveis direto', () => {
    const env = setup();
    const { orderId } = env.checkout.placeOrder(order);

    // Backoffice estornando por fora da fachada, e um fluxo próprio de reserva.
    env.subsystem.payments.refund('ch_1');
    const reservation = env.subsystem.inventory.reserve([{ sku: 'kbd-01', quantity: 2 }]);
    env.subsystem.inventory.release(reservation);

    assert.equal(orderId, 'order-1');
    assert.equal(env.subsystem.payments.charges[0]?.refunded, true);
    assert.equal(env.subsystem.inventory.available('kbd-01'), 2);
  });
});
