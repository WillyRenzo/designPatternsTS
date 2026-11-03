import type { ChargeRequest, ChargeResult, DeclineReason, PaymentGateway } from './payment-gateway.ts';
import { GatewayUnavailableError } from './payment-gateway.ts';
import type { LegacyBankGateway } from './vendors/legacy-bank-gateway.ts';

const DECLINE_REASONS: Readonly<Record<string, DeclineReason>> = {
  '51': 'insufficient_funds',
  '54': 'card_expired',
  '59': 'fraud_suspected',
};

// Adapter (de objeto): converte centavos em "89,90", a chamada síncrona em Promise
// e os códigos ISO 8583 nos status do Target.
export class LegacyBankAdapter implements PaymentGateway {
  readonly name = 'legacy-bank';
  readonly #bank: LegacyBankGateway;

  constructor(bank: LegacyBankGateway) {
    this.#bank = bank;
  }

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const response = this.#bank.autorizar(formatCents(request.amountCents), request.cardToken, request.orderId);
    const [code = '', nsu = ''] = response.split('|');

    if (code === '00') return { status: 'approved', transactionId: `nsu-${nsu}` };
    if (code === '91') throw new GatewayUnavailableError('emissor indisponível no banco legado (91)');
    if (code === '30') throw new Error(`requisição rejeitada pelo banco legado por formato inválido: ${response}`);
    return { status: 'declined', reason: DECLINE_REASONS[code] ?? 'unknown' };
  }
}

// Só aritmética inteira: dividir por 100 em ponto flutuante gera valores como 0.29000000000000004.
function formatCents(cents: number): string {
  const reais = Math.trunc(cents / 100);
  const centavos = String(cents % 100).padStart(2, '0');
  return `${reais},${centavos}`;
}
