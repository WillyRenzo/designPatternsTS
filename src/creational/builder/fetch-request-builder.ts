import type { HttpMethod, HttpRequestBuilder } from './http-request-builder.ts';

// ConcreteBuilder: monta um Request da Web API, pronto para fetch().
export class FetchRequestBuilder implements HttpRequestBuilder {
  #method: HttpMethod = 'GET';
  #url: URL | undefined;
  readonly #headers = new Headers();
  #body: string | undefined;

  setMethod(method: HttpMethod): void {
    this.#method = method;
  }

  setUrl(url: string): void {
    this.#url = new URL(url);
  }

  addQueryParam(name: string, value: string): void {
    this.#requireUrl().searchParams.append(name, value);
  }

  addHeader(name: string, value: string): void {
    this.#headers.append(name, value);
  }

  setJsonBody(body: unknown): void {
    this.#body = JSON.stringify(body);
    this.#headers.set('Content-Type', 'application/json');
  }

  getResult(): Request {
    const init: RequestInit = { method: this.#method, headers: this.#headers };
    if (this.#body !== undefined) init.body = this.#body;
    return new Request(this.#requireUrl(), init);
  }

  #requireUrl(): URL {
    if (!this.#url) throw new Error('setUrl() precisa ser chamado antes deste passo');
    return this.#url;
  }
}
