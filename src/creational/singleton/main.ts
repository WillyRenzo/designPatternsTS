import { MetricsRegistry } from './metrics-registry.ts';
import { handleCreateOrder } from './orders-handler.ts';
import { handleCharge } from './payments-handler.ts';

// Simula o tráfego de dois módulos que não se conhecem.
handleCreateOrder('created');
handleCreateOrder('created');
handleCreateOrder('rejected');
handleCharge(8990, true);
handleCharge(4500, false);

// O endpoint /metrics lê tudo do mesmo lugar.
console.log('GET /metrics\n');
console.log(MetricsRegistry.getInstance().render());
