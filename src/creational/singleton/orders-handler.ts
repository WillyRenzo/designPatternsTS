import { MetricsRegistry } from './metrics-registry.ts';

export type OrderResult = 'created' | 'rejected';

// Client: nenhum registro é passado para cá; o acesso é pelo ponto global.
export function handleCreateOrder(result: OrderResult): void {
  const metrics = MetricsRegistry.getInstance();
  metrics.counter('http_requests_total', 'Requisições HTTP recebidas').inc({ route: '/orders', method: 'POST' });
  metrics.counter('orders_total', 'Pedidos recebidos por resultado').inc({ result });
}
