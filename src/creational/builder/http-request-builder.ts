export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Builder: os passos de montagem de uma requisição, sem dizer qual é o produto.
// Não há getResult() aqui: cada ConcreteBuilder entrega um produto de tipo diferente
// (um Request, uma string), então não existe uma interface comum para o resultado.
export interface HttpRequestBuilder {
  setMethod(method: HttpMethod): void;
  setUrl(url: string): void;
  addQueryParam(name: string, value: string): void;
  addHeader(name: string, value: string): void;
  setJsonBody(body: unknown): void;
}
