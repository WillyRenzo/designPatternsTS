import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { MetricsRegistry } from './metrics-registry.ts';
import { handleCreateOrder } from './orders-handler.ts';
import { handleCharge } from './payments-handler.ts';

describe('Singleton', () => {
  // Estado global: sem isto, cada teste herdaria as métricas do anterior.
  beforeEach(() => MetricsRegistry.resetForTests());

  it('getInstance() devolve sempre a mesma instância', () => {
    assert.equal(MetricsRegistry.getInstance(), MetricsRegistry.getInstance());
  });

  it('módulos que não se conhecem escrevem no mesmo registro', () => {
    handleCreateOrder('created');
    handleCreateOrder('rejected');
    handleCharge(8990, true);

    const requests = MetricsRegistry.getInstance().counter('http_requests_total', 'Requisições HTTP recebidas');
    assert.equal(requests.get({ route: '/orders', method: 'POST' }), 2);
    assert.equal(requests.get({ method: 'POST', route: '/payments' }), 1);
    assert.match(MetricsRegistry.getInstance().render(), /^payments_amount_cents_total 8990$/m);
  });

  it('o construtor é bloqueado também em runtime, não só pelo compilador', () => {
    assert.throws(() => Reflect.construct(MetricsRegistry, []), /use MetricsRegistry.getInstance\(\)/);
  });

  it('resetForTests() descarta a instância e o estado global', () => {
    const before = MetricsRegistry.getInstance();
    handleCreateOrder('created');

    MetricsRegistry.resetForTests();

    assert.notEqual(MetricsRegistry.getInstance(), before);
    assert.equal(MetricsRegistry.getInstance().render(), '');
  });

  it('renderiza no formato de exposição do Prometheus, com labels ordenados e escapados', () => {
    const counter = MetricsRegistry.getInstance().counter('jobs_total', 'Jobs processados');
    counter.inc({ queue: 'e"mail', status: 'ok' }, 2);

    assert.equal(
      MetricsRegistry.getInstance().render(),
      '# HELP jobs_total Jobs processados\n# TYPE jobs_total counter\njobs_total{queue="e\\"mail",status="ok"} 2',
    );
  });

  it('rejeita nome inválido, descrição conflitante e decremento', () => {
    const metrics = MetricsRegistry.getInstance();
    metrics.counter('orders_total', 'Pedidos');

    assert.throws(() => metrics.counter('orders-total', 'Pedidos'), /nome de métrica inválido/);
    assert.throws(() => metrics.counter('orders_total', 'Outra coisa'), /já registrada com outra descrição/);
    assert.throws(() => metrics.counter('orders_total', 'Pedidos').inc({}, -1), /contador só cresce/);
  });

  it('limite do padrão em ESM: o mesmo arquivo carregado como outro módulo cria outro singleton', async () => {
    // Acontece de verdade quando duas versões do pacote convivem no node_modules.
    const href = new URL('./metrics-registry.ts', import.meta.url).href;
    const duplicate = (await import(`${href}?segunda-copia`)) as typeof import('./metrics-registry.ts');

    assert.notEqual(duplicate.MetricsRegistry.getInstance(), MetricsRegistry.getInstance());
  });
});
