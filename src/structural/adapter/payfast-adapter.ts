import type { ChargeRequest, ChargeResult, DeclineReason, PaymentGateway } from './payment-gateway.ts';
import { GatewayUnavailableError } from './payment-gateway.ts';
import { PayFastApiError, type PayFastClient, type PayFastPayment } from './vendors/payfast-client.ts';

const DECLINE_REASONS: Record<NonNullable<PayFastPayment['failure_code']>, DeclineReason> = {
  insufficient_funds: 'insufficient_funds',
  expired_card: 'card_expired',
  fraudulent: 'fraud_suspected',
  processing_error: 'unknown',
};

// Adapter (de objeto): implementa o Target e delega a um PayFastClient recebido por composição.
export class PayFastAdapter implements PaymentGateway {
  readonly name = 'payfast';
  readonly #client: PayFastClient;

  constructor(client: PayFastClient) {
    this.#client = client;
  }

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    let payment: PayFastPayment;
    try {
      payment = await this.#client.createPayment({
        amount: request.amountCents,
        currency: 'brl',
        source: request.cardToken,
        metadata: { order_id: request.orderId },
        // O pedido como chave de idempotência: um retry do checkout não cobra duas vezes.
        idempotency_key: `order-${request.orderId}`,
      });
    } catch (error) {
      if (error instanceof PayFastApiError && error.statusCode >= 500) {
        throw new GatewayUnavailableError(`payfast indisponível (${error.statusCode})`, { cause: error });
      }
      throw error;
    }

    if (payment.status === 'succeeded') return { status: 'approved', transactionId: payment.id };
    return { status: 'declined', reason: payment.failure_code ? DECLINE_REASONS[payment.failure_code] : 'unknown' };
  }
}
