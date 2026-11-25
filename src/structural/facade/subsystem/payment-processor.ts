export interface Charge {
  readonly id: string;
  readonly amountCents: number;
  readonly refunded: boolean;
}

export class PaymentDeclinedError extends Error {
  override readonly name = 'PaymentDeclinedError';
}

// Subsistema: cobrança e estorno. O token "tok_declined" simula cartão recusado.
export class PaymentProcessor {
  readonly #charges = new Map<string, Charge>();
  #sequence = 0;

  charge(amountCents: number, cardToken: string): string {
    if (cardToken === 'tok_declined') throw new PaymentDeclinedError('cartão recusado pelo emissor');
    this.#sequence += 1;
    const id = `ch_${this.#sequence}`;
    this.#charges.set(id, { id, amountCents, refunded: false });
    return id;
  }

  refund(chargeId: string): void {
    const charge = this.#charges.get(chargeId);
    if (!charge) throw new Error(`cobrança desconhecida: ${chargeId}`);
    this.#charges.set(chargeId, { ...charge, refunded: true });
  }

  get charges(): readonly Charge[] {
    return [...this.#charges.values()];
  }
}
