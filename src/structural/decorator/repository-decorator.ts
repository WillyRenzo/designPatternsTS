import type { Product, ProductRepository } from './product-repository.ts';

// Decorator: tem a mesma interface do Component e guarda o objeto embrulhado.
// Por padrão só repassa; cada decorador concreto sobrescreve o que muda.
export abstract class RepositoryDecorator implements ProductRepository {
  // protected, não #private: as subclasses precisam chegar ao embrulhado.
  protected readonly inner: ProductRepository;

  constructor(inner: ProductRepository) {
    this.inner = inner;
  }

  findById(id: string): Promise<Product | undefined> {
    return this.inner.findById(id);
  }

  save(product: Product): Promise<void> {
    return this.inner.save(product);
  }
}
