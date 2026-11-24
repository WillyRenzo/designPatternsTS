import type { Product, ProductRepository } from './product-repository.ts';
import { RepositoryDecorator } from './repository-decorator.ts';

export interface CacheOptions {
  readonly ttlMs: number;
  readonly now: () => number;
}

// ConcreteDecorator: guarda leituras por um tempo e invalida a entrada quando
// o produto é salvo por ele.
export class CachingRepository extends RepositoryDecorator {
  readonly #entries = new Map<string, { product: Product; expiresAt: number }>();
  readonly #ttlMs: number;
  readonly #now: () => number;

  constructor(inner: ProductRepository, { ttlMs, now }: CacheOptions) {
    super(inner);
    this.#ttlMs = ttlMs;
    this.#now = now;
  }

  override async findById(id: string): Promise<Product | undefined> {
    const entry = this.#entries.get(id);
    if (entry && entry.expiresAt > this.#now()) return entry.product;

    const product = await super.findById(id);
    // Ausência não é guardada: um produto criado depois aparece na próxima leitura.
    if (product) this.#entries.set(id, { product, expiresAt: this.#now() + this.#ttlMs });
    else this.#entries.delete(id);
    return product;
  }

  override async save(product: Product): Promise<void> {
    await super.save(product);
    this.#entries.delete(product.id);
  }
}
