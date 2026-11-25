export interface StockLine {
  readonly sku: string;
  readonly quantity: number;
}

export class OutOfStockError extends Error {
  override readonly name = 'OutOfStockError';
}

// Subsistema: estoque com reserva em duas fases. reserve() separa as unidades,
// commit() confirma a baixa e release() devolve tudo.
export class Inventory {
  readonly #stock = new Map<string, number>();
  readonly #reservations = new Map<string, ReadonlyMap<string, number>>();
  #sequence = 0;

  constructor(stock: Readonly<Record<string, number>>) {
    for (const [sku, quantity] of Object.entries(stock)) this.#stock.set(sku, quantity);
  }

  available(sku: string): number {
    return this.#stock.get(sku) ?? 0;
  }

  // Tudo ou nada: confere todas as linhas antes de mexer em qualquer uma.
  reserve(lines: readonly StockLine[]): string {
    const requested = new Map<string, number>();
    for (const { sku, quantity } of lines) requested.set(sku, (requested.get(sku) ?? 0) + quantity);

    for (const [sku, quantity] of requested) {
      const available = this.available(sku);
      if (available < quantity) throw new OutOfStockError(`${sku}: pedido ${quantity}, disponível ${available}`);
    }
    for (const [sku, quantity] of requested) this.#stock.set(sku, this.available(sku) - quantity);

    this.#sequence += 1;
    const id = `res-${this.#sequence}`;
    this.#reservations.set(id, requested);
    return id;
  }

  release(reservationId: string): void {
    const reserved = this.#reservations.get(reservationId);
    if (!reserved) return;
    for (const [sku, quantity] of reserved) this.#stock.set(sku, this.available(sku) + quantity);
    this.#reservations.delete(reservationId);
  }

  commit(reservationId: string): void {
    if (!this.#reservations.delete(reservationId)) throw new Error(`reserva desconhecida: ${reservationId}`);
  }
}
