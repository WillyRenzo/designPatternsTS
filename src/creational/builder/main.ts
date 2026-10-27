import { CurlCommandBuilder } from './curl-command-builder.ts';
import { FetchRequestBuilder } from './fetch-request-builder.ts';
import { type ApiConfig, type NewOrder, OrdersApiDirector } from './orders-api-director.ts';

const config: ApiConfig = { baseUrl: 'https://api.loja.example', token: 'token-de-exemplo' };
const order: NewOrder = { customerId: 'c-42', items: [{ sku: 'cafe-500g', quantity: 2 }] };

// Mesmo Director, mesmos passos, dois produtos. O client escolhe o builder e
// pega o resultado nele, não no Director.
const fetchBuilder = new FetchRequestBuilder();
new OrdersApiDirector(fetchBuilder, config).constructCreateOrder(order, 'pedido-c42-001');
const request = fetchBuilder.getResult();
console.log('[fetch]', request.method, request.url, Object.fromEntries(request.headers));

const curlBuilder = new CurlCommandBuilder();
new OrdersApiDirector(curlBuilder, config).constructCreateOrder(order, 'pedido-c42-001');
console.log('[curl] ', curlBuilder.getResult());

const listBuilder = new CurlCommandBuilder();
new OrdersApiDirector(listBuilder, config).constructListOrders(2, 'paid');
console.log('[curl] ', listBuilder.getResult());
