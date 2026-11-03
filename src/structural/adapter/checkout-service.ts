import type { ChargeRequest, ChargeResult, PaymentGateway } from './payment-gateway.ts';
import { GatewayUnavailableError } from './payment-gateway.ts';

export interface CheckoutOutcome {
  readonly gateway: string;
  readonly result: ChargeResult;
}

// Client: só conhece PaymentGateway. Como os dois provedores falam a mesma
// interface, trocar de um para o outro quando o primeiro cai é só um loop.
export class CheckoutService {
  readonly #gateways: readonly PaymentGateway[];

  constructor(gateways: readonly PaymentGateway[]) {
    if (gateways.length === 0) throw new Error('informe ao menos um gateway');
    this.#gateways = gateways;
  }

  async pay(request: ChargeRequest): Promise<CheckoutOutcome> {
    if (!Number.isSafeInteger(request.amountCents) || request.amountCents <= 0) {
      throw new Error(`valor inválido: ${request.amountCents} (use centavos inteiros e positivos)`);
    }

    const failures: string[] = [];
    for (const gateway of this.#gateways) {
      try {
        return { gateway: gateway.name, result: await gateway.charge(request) };
      } catch (error) {
        // Só indisponibilidade justifica tentar o próximo; recusa e erro de programação, não.
        if (!(error instanceof GatewayUnavailableError)) throw error;
        failures.push(error.message);
      }
    }
    throw new GatewayUnavailableError(`nenhum gateway disponível: ${failures.join('; ')}`);
  }
}
