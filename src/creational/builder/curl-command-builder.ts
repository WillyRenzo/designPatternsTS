import type { HttpMethod, HttpRequestBuilder } from './http-request-builder.ts';

// ConcreteBuilder: monta a mesma requisição como um comando curl, para debug ou documentação.
export class CurlCommandBuilder implements HttpRequestBuilder {
  #method: HttpMethod = 'GET';
  #url: URL | undefined;
  readonly #headers: string[] = [];
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
    this.#headers.push(`${name}: ${value}`);
  }

  setJsonBody(body: unknown): void {
    this.#body = JSON.stringify(body);
    this.#headers.push('Content-Type: application/json');
  }

  getResult(): string {
    const parts = ['curl', '-X', this.#method, shellQuote(this.#requireUrl().href)];
    for (const header of this.#headers) parts.push('-H', shellQuote(header));
    if (this.#body !== undefined) parts.push('--data', shellQuote(this.#body));
    return parts.join(' ');
  }

  #requireUrl(): URL {
    if (!this.#url) throw new Error('setUrl() precisa ser chamado antes deste passo');
    return this.#url;
  }
}

// Aspas simples não interpretam nada no shell; uma aspa simples no valor vira '\''.
function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}
