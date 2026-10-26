import type { CloudProviderFactory } from './cloud-provider-factory.ts';
import type { MessageQueue, ObjectStorage, PublishedMessage } from './products.ts';

// Client: só conhece CloudProviderFactory e as interfaces dos produtos.
// Trocar de nuvem é trocar a fábrica injetada; nada aqui muda.
export class ReportPublisher {
  readonly #storage: ObjectStorage;
  readonly #queue: MessageQueue;

  constructor(factory: CloudProviderFactory) {
    this.#storage = factory.createStorage();
    this.#queue = factory.createQueue();
  }

  publish(reportName: string, content: string): PublishedMessage {
    const stored = this.#storage.upload(`${reportName}.csv`, content);
    return this.#queue.publish(JSON.stringify({ event: 'report.published', url: stored.url }));
  }
}
