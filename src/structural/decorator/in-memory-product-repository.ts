import { type Product, type ProductRepository, TransientError } from './product-repository.ts';

// ConcreteComponent: o "banco" em memória. Só sabe guardar e buscar; cache,
// retry e log vêm de fora, pelos decoradores.
export class InMemoryProductRepository implements ProductRepository {
  readonly #products = new Map<string, Product>();
  #pendingFailures = 0;

  constructor(products: readonly Product[] = []) {
    for (const product of products) this.#products.set(product.id, { ...product });
  }

  // Simula instabilidade: as próximas `count` leituras falham como um timeout.
  failNextReads(count: number): void {
    this.#pendingFailures = count;
  }

  async findById(id: string): Promise<Product | undefined> {
    if (this.#pendingFailures > 0) {
      this.#pendingFailures -= 1;
      throw new TransientError(`timeout ao ler ${id}`);
    }
    const product = this.#products.get(id);
    return product && { ...product };
  }

  async save(product: Product): Promise<void> {
    this.#products.set(product.id, { ...product });
  }
}
