import { type Product, type ProductRepository, TransientError } from './product-repository.ts';
import { RepositoryDecorator } from './repository-decorator.ts';

export interface RetryOptions {
  readonly attempts: number;
  readonly backoffMs: number;
  readonly sleep: (ms: number) => Promise<void>;
}

// ConcreteDecorator: repete leituras que falharam por TransientError, com
// espera exponencial (backoffMs, 2×, 4×...). Outros erros sobem na hora.
export class RetryingRepository extends RepositoryDecorator {
  readonly #attempts: number;
  readonly #backoffMs: number;
  readonly #sleep: (ms: number) => Promise<void>;

  constructor(inner: ProductRepository, { attempts, backoffMs, sleep }: RetryOptions) {
    if (!Number.isInteger(attempts) || attempts < 1) throw new Error(`tentativas inválidas: ${attempts}`);
    super(inner);
    this.#attempts = attempts;
    this.#backoffMs = backoffMs;
    this.#sleep = sleep;
  }

  override async findById(id: string): Promise<Product | undefined> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await super.findById(id);
      } catch (error) {
        if (!(error instanceof TransientError) || attempt >= this.#attempts) throw error;
        await this.#sleep(this.#backoffMs * 2 ** (attempt - 1));
      }
    }
  }

  // save não é sobrescrito: repetir uma escrita só é seguro se ela for
  // idempotente, e a interface não garante isso. O decorador escolhe o que decora.
}
