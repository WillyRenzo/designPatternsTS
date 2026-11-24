import { CachingRepository } from './caching-repository.ts';
import { InMemoryProductRepository } from './in-memory-product-repository.ts';
import { LoggingRepository } from './logging-repository.ts';
import type { Product, ProductRepository } from './product-repository.ts';
import { RetryingRepository } from './retrying-repository.ts';

const catalog: Product[] = [{ id: 'p-1', name: 'Teclado mecânico', priceCents: 34990 }];
const cache = { ttlMs: 60_000, now: () => 0 };
const retry = { attempts: 3, backoffMs: 100, sleep: async (ms: number) => console.log(`  (retry: aguardando ${ms}ms)`) };
const log = (line: string) => console.log(`  [log] ${line}`);

// O mesmo roteiro para as duas pilhas: o banco falha duas vezes, depois
// lemos, lemos de novo, mudamos o preço e lemos mais uma vez.
async function scenario(repo: ProductRepository, db: InMemoryProductRepository): Promise<void> {
  db.failNextReads(2);
  console.log('  →', await repo.findById('p-1'));
  console.log('  →', await repo.findById('p-1'));
  await repo.save({ id: 'p-1', name: 'Teclado mecânico', priceCents: 29990 });
  console.log('  →', await repo.findById('p-1'));
}

// Pilha 1: o log fica por fora, então registra o que o client pediu.
console.log('Logging(Caching(Retrying(db))): o log vê cada pedido do client');
const db1 = new InMemoryProductRepository(catalog);
await scenario(new LoggingRepository(new CachingRepository(new RetryingRepository(db1, retry), cache), log), db1);

// Pilha 2: as mesmas classes em outra ordem. O log por dentro do retry
// registra cada tentativa que chega ao banco, e nada do que o cache resolve.
console.log('\nCaching(Retrying(Logging(db))): o log vê cada ida ao banco');
const db2 = new InMemoryProductRepository(catalog);
await scenario(new CachingRepository(new RetryingRepository(new LoggingRepository(db2, log), retry), cache), db2);
