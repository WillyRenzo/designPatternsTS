import type { HttpRequestBuilder } from './http-request-builder.ts';

export interface ApiConfig {
  readonly baseUrl: string;
  readonly token: string;
}

export interface NewOrder {
  readonly customerId: string;
  readonly items: ReadonlyArray<{ readonly sku: string; readonly quantity: number }>;
}

export type OrderStatus = 'open' | 'paid' | 'cancelled';

// Director: conhece a API de pedidos (rotas, autenticação, cabeçalhos obrigatórios) e
// executa os passos na ordem certa. Não sabe qual produto está sendo montado.
export class OrdersApiDirector {
  readonly #builder: HttpRequestBuilder;
  readonly #config: ApiConfig;

  constructor(builder: HttpRequestBuilder, config: ApiConfig) {
    this.#builder = builder;
    this.#config = config;
  }

  constructCreateOrder(order: NewOrder, idempotencyKey: string): void {
    this.#start('POST', '/orders');
    this.#builder.addHeader('Idempotency-Key', idempotencyKey);
    this.#builder.setJsonBody(order);
  }

  constructListOrders(page: number, status?: OrderStatus): void {
    this.#start('GET', '/orders');
    this.#builder.addQueryParam('page', String(page));
    if (status) this.#builder.addQueryParam('status', status);
  }

  #start(method: 'GET' | 'POST', path: string): void {
    this.#builder.setMethod(method);
    this.#builder.setUrl(`${this.#config.baseUrl}${path}`);
    this.#builder.addHeader('Authorization', `Bearer ${this.#config.token}`);
    this.#builder.addHeader('Accept', 'application/json');
  }
}
