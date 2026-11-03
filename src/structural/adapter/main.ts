import { CheckoutService } from './checkout-service.ts';
import { LegacyBankAdapter } from './legacy-bank-adapter.ts';
import { PayFastAdapter } from './payfast-adapter.ts';
import { LegacyBankGateway } from './vendors/legacy-bank-gateway.ts';
import { PayFastClient } from './vendors/payfast-client.ts';

// Composição: os SDKs entram embrulhados nos adapters; o checkout só vê PaymentGateway.
const payfast = new PayFastAdapter(new PayFastClient());
const legacy = new LegacyBankAdapter(new LegacyBankGateway());
const checkout = new CheckoutService([payfast, legacy]);

const attempts = [
  { label: 'aprovado na PayFast', orderId: 'A-1', amountCents: 8990, cardToken: 'tok_visa' },
  { label: 'recusado (saldo)', orderId: 'A-2', amountCents: 4500, cardToken: 'tok_insufficient' },
  { label: 'PayFast fora do ar → banco legado', orderId: 'A-3', amountCents: 12999, cardToken: 'tok_unavailable' },
];

for (const { label, ...request } of attempts) {
  console.log(`[${label}]`, await checkout.pay(request));
}

// O banco legado sozinho, com os cartões de teste dele.
const legacyOnly = new CheckoutService([legacy]);
console.log('[banco legado, cartão vencido]', await legacyOnly.pay({ orderId: 'B-1', amountCents: 2990, cardToken: '4111111111110054' }));
