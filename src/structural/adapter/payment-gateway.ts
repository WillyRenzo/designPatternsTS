export interface ChargeRequest {
  readonly orderId: string;
  readonly amountCents: number;
  readonly cardToken: string;
}

export type DeclineReason = 'insufficient_funds' | 'card_expired' | 'fraud_suspected' | 'unknown';

export type ChargeResult =
  | { readonly status: 'approved'; readonly transactionId: string }
  | { readonly status: 'declined'; readonly reason: DeclineReason };

// Falha técnica do provedor (fora do ar, timeout), diferente de cartão recusado:
// recusa é resposta final; indisponibilidade permite tentar outro gateway.
export class GatewayUnavailableError extends Error {
  override readonly name = 'GatewayUnavailableError';
}

// Target: a interface que o checkout conhece. Valores em centavos e status
// padronizados, independentes de qualquer provedor.
export interface PaymentGateway {
  readonly name: string;
  charge(request: ChargeRequest): Promise<ChargeResult>;
}
