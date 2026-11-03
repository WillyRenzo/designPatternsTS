// Adaptee: simulação do SDK de um provedor moderno. É código de terceiros: não
// o alteramos, então os nomes e formatos seguem a API dele, não a nossa.

export interface PayFastPaymentParams {
  amount: number; // centavos
  currency: 'brl' | 'usd';
  source: string;
  metadata: Record<string, string>;
  idempotency_key: string;
}

export interface PayFastPayment {
  id: string;
  status: 'succeeded' | 'failed';
  failure_code?: 'insufficient_funds' | 'expired_card' | 'fraudulent' | 'processing_error';
}

export class PayFastApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Tokens de teste, no estilo dos sandboxes reais.
const FAILURES: Record<string, PayFastPayment['failure_code']> = {
  tok_insufficient: 'insufficient_funds',
  tok_expired: 'expired_card',
  tok_fraud: 'fraudulent',
};

export class PayFastClient {
  readonly #byIdempotencyKey = new Map<string, PayFastPayment>();
  #sequence = 0;

  async createPayment(params: PayFastPaymentParams): Promise<PayFastPayment> {
    if (params.source.startsWith('tok_unavailable')) throw new PayFastApiError(503, 'service unavailable');

    const previous = this.#byIdempotencyKey.get(params.idempotency_key);
    if (previous) return previous;

    this.#sequence += 1;
    const failure = FAILURES[params.source];
    const payment: PayFastPayment = failure
      ? { id: `pf_${this.#sequence}`, status: 'failed', failure_code: failure }
      : { id: `pf_${this.#sequence}`, status: 'succeeded' };
    this.#byIdempotencyKey.set(params.idempotency_key, payment);
    return payment;
  }
}
