import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CurlCommandBuilder } from './curl-command-builder.ts';
import { FetchRequestBuilder } from './fetch-request-builder.ts';
import { type NewOrder, OrdersApiDirector } from './orders-api-director.ts';

const config = { baseUrl: 'https://api.loja.example', token: 't0k3n' };
const order: NewOrder = { customerId: 'c-1', items: [{ sku: 'cafe', quantity: 2 }] };

describe('Builder', () => {
  it('o mesmo processo de construção gera representações diferentes da mesma requisição', async () => {
    const fetchBuilder = new FetchRequestBuilder();
    const curlBuilder = new CurlCommandBuilder();
    new OrdersApiDirector(fetchBuilder, config).constructCreateOrder(order, 'k-1');
    new OrdersApiDirector(curlBuilder, config).constructCreateOrder(order, 'k-1');

    const request = fetchBuilder.getResult();
    assert.equal(request.method, 'POST');
    assert.equal(request.url, 'https://api.loja.example/orders');
    assert.equal(request.headers.get('authorization'), 'Bearer t0k3n');
    assert.equal(request.headers.get('idempotency-key'), 'k-1');
    assert.equal(request.headers.get('content-type'), 'application/json');
    assert.deepEqual(await request.json(), order);

    assert.equal(
      curlBuilder.getResult(),
      "curl -X POST 'https://api.loja.example/orders'" +
        " -H 'Authorization: Bearer t0k3n' -H 'Accept: application/json' -H 'Idempotency-Key: k-1'" +
        ` -H 'Content-Type: application/json' --data '${JSON.stringify(order)}'`,
    );
  });

  it('o Director aplica os parâmetros opcionais só quando informados', () => {
    const withStatus = new FetchRequestBuilder();
    const withoutStatus = new FetchRequestBuilder();
    new OrdersApiDirector(withStatus, config).constructListOrders(2, 'paid');
    new OrdersApiDirector(withoutStatus, config).constructListOrders(1);

    assert.equal(withStatus.getResult().url, 'https://api.loja.example/orders?page=2&status=paid');
    assert.equal(withoutStatus.getResult().url, 'https://api.loja.example/orders?page=1');
    assert.equal(withoutStatus.getResult().method, 'GET');
  });

  it('o comando curl escapa aspas simples do corpo', () => {
    const builder = new CurlCommandBuilder();
    builder.setMethod('POST');
    builder.setUrl('https://api.loja.example/notes');
    builder.setJsonBody({ text: "it's" });

    assert.match(builder.getResult(), /--data '\{"text":"it'\\''s"\}'$/);
  });

  it('falha cedo quando um passo depende de outro que ainda não rodou', () => {
    const builder = new FetchRequestBuilder();
    assert.throws(() => builder.addQueryParam('page', '1'), /setUrl\(\)/);
    assert.throws(() => builder.getResult(), /setUrl\(\)/);
  });
});
