import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CachingRepository } from './caching-repository.ts';
import { InMemoryProductRepository } from './in-memory-product-repository.ts';
import { LoggingRepository } from './logging-repository.ts';
import { type Product, type ProductRepository, TransientError } from './product-repository.ts';
import { RepositoryDecorator } from './repository-decorator.ts';
import { RetryingRepository } from './retrying-repository.ts';

const keyboard: Product = { id: 'p-1', name: 'Teclado', priceCents: 34990 };
const noSleep = async () => {};

// Um decorador novo, escrito só para o teste: conta o que chega até a camada de baixo.
class CountingRepository extends RepositoryDecorator {
  reads = 0;
  override findById(id: string): Promise<Product | undefined> {
    this.reads += 1;
    return super.findById(id);
  }
}

type Layer = (inner: ProductRepository) => ProductRepository;

function layers(log: string[] = []): Record<'cache' | 'retry' | 'log', Layer> {
  return {
    cache: (inner) => new CachingRepository(inner, { ttlMs: 1000, now: () => 0 }),
    retry: (inner) => new RetryingRepository(inner, { attempts: 3, backoffMs: 10, sleep: noSleep }),
    log: (inner) => new LoggingRepository(inner, (line) => log.push(line)),
  };
}

// stack(db, a, b, c) monta a(b(c(db))): o primeiro da lista fica por fora.
function stack(db: ProductRepository, ...wrappers: Layer[]): ProductRepository {
  return wrappers.reduceRight<ProductRepository>((inner, wrap) => wrap(inner), db);
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
}

describe('Decorator', () => {
  it('as 6 ordens de cache, retry e log dão o mesmo resultado para o client', async () => {
    const names = ['cache', 'retry', 'log'] as const;
    const outcomes = new Map<string, unknown>();

    for (const order of permutations(names)) {
      const db = new InMemoryProductRepository([keyboard]);
      const available = layers();
      const repo = stack(db, ...order.map((name) => available[name]));

      db.failNextReads(2);
      const first = await repo.findById('p-1');
      const cached = await repo.findById('p-1');
      await repo.save({ ...keyboard, priceCents: 29990 });
      const afterSave = await repo.findById('p-1');
      const missing = await repo.findById('p-404');

      outcomes.set(order.join(' > '), [first, cached, afterSave, missing]);
    }

    assert.equal(outcomes.size, 6);
    for (const [order, outcome] of outcomes) {
      assert.deepEqual(outcome, [keyboard, keyboard, { ...keyboard, priceCents: 29990 }, undefined], order);
    }
  });

  it('a ordem muda o que cada camada observa', async () => {
    const outerLog: string[] = [];
    const outerDb = new InMemoryProductRepository([keyboard]);
    const logOutside = stack(outerDb, layers(outerLog).log, layers().cache, layers().retry);

    const innerLog: string[] = [];
    const innerDb = new InMemoryProductRepository([keyboard]);
    const logInside = stack(innerDb, layers().cache, layers().retry, layers(innerLog).log);

    for (const [repo, db] of [[logOutside, outerDb], [logInside, innerDb]] as const) {
      db.failNextReads(1);
      await repo.findById('p-1');
      await repo.findById('p-1');
    }

    // Por fora: dois pedidos do client, sem ver a falha nem o cache.
    assert.deepEqual(outerLog, ['findById(p-1) → Teclado', 'findById(p-1) → Teclado']);
    // Por dentro: a tentativa que falhou e a que deu certo; o hit do cache nem chega.
    assert.deepEqual(innerLog, ['findById(p-1) → erro: timeout ao ler p-1', 'findById(p-1) → Teclado']);
  });

  it('o cache evita idas ao banco, expira pelo TTL e é invalidado pelo save', async () => {
    let now = 0;
    const counter = new CountingRepository(new InMemoryProductRepository([keyboard]));
    const repo = new CachingRepository(counter, { ttlMs: 1000, now: () => now });

    await repo.findById('p-1');
    await repo.findById('p-1');
    assert.equal(counter.reads, 1);

    now = 1000;
    await repo.findById('p-1');
    assert.equal(counter.reads, 2, 'expirou no TTL');

    await repo.save({ ...keyboard, priceCents: 1 });
    assert.equal((await repo.findById('p-1'))?.priceCents, 1);
    assert.equal(counter.reads, 3, 'save invalidou a entrada');
  });

  it('o cache não guarda ausência: um produto criado depois aparece', async () => {
    const db = new InMemoryProductRepository();
    const repo = new CachingRepository(db, { ttlMs: 1000, now: () => 0 });

    assert.equal(await repo.findById('p-1'), undefined);
    await db.save(keyboard); // escrita direto no banco, por fora do cache
    assert.deepEqual(await repo.findById('p-1'), keyboard);
  });

  it('o retry repete só falhas passageiras, com espera exponencial, e desiste no limite', async () => {
    const waits: number[] = [];
    const db = new InMemoryProductRepository([keyboard]);
    const counter = new CountingRepository(db);
    const repo = new RetryingRepository(counter, { attempts: 3, backoffMs: 100, sleep: async (ms) => void waits.push(ms) });

    db.failNextReads(2);
    assert.deepEqual(await repo.findById('p-1'), keyboard);
    assert.deepEqual(waits, [100, 200]);

    db.failNextReads(3);
    await assert.rejects(repo.findById('p-1'), TransientError);
    assert.equal(counter.reads, 6);

    const broken = new RetryingRepository(
      { findById: async () => { throw new Error('tabela não existe'); }, save: async () => {} },
      { attempts: 3, backoffMs: 100, sleep: noSleep },
    );
    await assert.rejects(broken.findById('p-1'), /tabela não existe/);

    assert.throws(() => new RetryingRepository(db, { attempts: 0, backoffMs: 1, sleep: noSleep }), /tentativas inválidas/);
  });

  it('o retry não repete escritas: save passa direto pelo decorador base', async () => {
    let saves = 0;
    const flakyWrites: ProductRepository = {
      findById: async () => undefined,
      save: async () => {
        saves += 1;
        throw new TransientError('timeout ao gravar');
      },
    };
    const repo = new RetryingRepository(flakyWrites, { attempts: 3, backoffMs: 1, sleep: noSleep });

    await assert.rejects(repo.save(keyboard), TransientError);
    assert.equal(saves, 1);
  });

  it('o log registra erros e deixa o erro subir', async () => {
    const log: string[] = [];
    const db = new InMemoryProductRepository([keyboard]);
    const repo = new LoggingRepository(db, (line) => log.push(line));

    db.failNextReads(1);
    await assert.rejects(repo.findById('p-1'), TransientError);
    await repo.save(keyboard);

    assert.deepEqual(log, ['findById(p-1) → erro: timeout ao ler p-1', 'save(p-1) → ok']);
  });
});
