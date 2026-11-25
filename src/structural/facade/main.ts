import { CheckoutError, CheckoutFacade, type CheckoutRequest } from './checkout-facade.ts';
import { Inventory } from './subsystem/inventory.ts';
import { Mailer } from './subsystem/mailer.ts';
import { PaymentProcessor } from './subsystem/payment-processor.ts';
import { ProductCatalog } from './subsystem/product-catalog.ts';
import { ShippingService } from './subsystem/shipping-service.ts';

const subsystem = {
  catalog: new ProductCatalog({
    'kbd-01': { name: 'Teclado mecânico', priceCents: 34990 },
    'mouse-01': { name: 'Mouse sem fio', priceCents: 12990 },
  }),
  inventory: new Inventory({ 'kbd-01': 5, 'mouse-01': 10 }),
  payments: new PaymentProcessor(),
  shipping: new ShippingService(),
  mailer: new Mailer(),
};
const checkout = new CheckoutFacade(subsystem);

const base: CheckoutRequest = {
  customerEmail: 'carla@cliente.com',
  items: [{ sku: 'mouse-01', quantity: 1 }],
  zip: '01310-100',
  cardToken: 'tok_visa',
};

const attempts: Array<[string, CheckoutRequest]> = [
  ['mouse (paga frete)', base],
  ['teclado + mouse (frete grátis)', { ...base, items: [{ sku: 'kbd-01', quantity: 1 }, { sku: 'mouse-01', quantity: 1 }] }],
  ['cartão recusado', { ...base, cardToken: 'tok_declined' }],
  ['transportadora fora do ar', { ...base, zip: '99010-000' }],
  ['sem estoque', { ...base, items: [{ sku: 'kbd-01', quantity: 9 }] }],
];

// O client: uma chamada por pedido, um tipo de erro.
for (const [label, request] of attempts) {
  try {
    console.log(`[${label}]`, checkout.placeOrder(request));
  } catch (error) {
    if (!(error instanceof CheckoutError)) throw error;
    console.log(`[${label}] falhou: ${error.reason} (${error.message})`);
  }
}

// A fachada não tranca o subsistema: o backoffice consulta as classes direto.
console.log('\nbackoffice, direto no subsistema:');
console.log('  estoque', { 'kbd-01': subsystem.inventory.available('kbd-01'), 'mouse-01': subsystem.inventory.available('mouse-01') });
console.log('  cobranças', subsystem.payments.charges);
console.log('  e-mails enviados', subsystem.mailer.outbox.length);
