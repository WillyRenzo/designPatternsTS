export interface Product {
  readonly id: string;
  readonly name: string;
  readonly priceCents: number;
}

// Falha passageira (timeout, conexão caída): tentar de novo pode dar certo.
// Qualquer outro erro é tratado como definitivo.
export class TransientError extends Error {
  override readonly name = 'TransientError';
}

// Component: a interface que o código de negócio conhece. O repositório
// concreto e todos os decoradores a implementam.
export interface ProductRepository {
  findById(id: string): Promise<Product | undefined>;
  save(product: Product): Promise<void>;
}
