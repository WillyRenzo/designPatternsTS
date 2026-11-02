import { MetricsRegistry } from './metrics-registry.ts';

// Client: outro módulo, sem nenhuma referência ao de pedidos, escrevendo no mesmo registro.
export function handleCharge(amountCents: number, approved: boolean): void {
  const metrics = MetricsRegistry.getInstance();
  metrics.counter('http_requests_total', 'Requisições HTTP recebidas').inc({ route: '/payments', method: 'POST' });
  metrics.counter('payments_total', 'Cobranças por resultado').inc({ result: approved ? 'approved' : 'declined' });
  if (approved) {
    metrics.counter('payments_amount_cents_total', 'Valor aprovado, em centavos').inc({}, amountCents);
  }
}
