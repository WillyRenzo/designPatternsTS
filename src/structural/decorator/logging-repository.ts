import type { Product, ProductRepository } from './product-repository.ts';
import { RepositoryDecorator } from './repository-decorator.ts';

// ConcreteDecorator: registra cada chamada que passa por ele e o resultado,
// inclusive erros, que continuam subindo.
export class LoggingRepository extends RepositoryDecorator {
  readonly #log: (line: string) => void;

  constructor(inner: ProductRepository, log: (line: string) => void) {
    super(inner);
    this.#log = log;
  }

  override findById(id: string): Promise<Product | undefined> {
    return this.#logged(`findById(${id})`, () => super.findById(id), (product) => (product ? product.name : 'não encontrado'));
  }

  override save(product: Product): Promise<void> {
    return this.#logged(`save(${product.id})`, () => super.save(product), () => 'ok');
  }

  async #logged<T>(call: string, run: () => Promise<T>, describe: (result: T) => string): Promise<T> {
    try {
      const result = await run();
      this.#log(`${call} → ${describe(result)}`);
      return result;
    } catch (error) {
      this.#log(`${call} → erro: ${(error as Error).message}`);
      throw error;
    }
  }
}
