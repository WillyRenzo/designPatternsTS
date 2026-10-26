import type { CloudProviderFactory } from '../cloud-provider-factory.ts';
import type { MessageQueue, ObjectStorage, PublishedMessage, StoredObject } from '../products.ts';

// Família Azure: ConcreteProducts (Blob Storage + Service Bus) e a ConcreteFactory que os cria.

class BlobStorage implements ObjectStorage {
  readonly provider = 'azure';
  readonly #account: string;
  readonly #objects = new Map<string, string>();

  constructor(account: string) {
    this.#account = account;
  }

  upload(key: string, content: string): StoredObject {
    this.#objects.set(key, content);
    return { provider: this.provider, url: `https://${this.#account}.blob.core.windows.net/reports/${key}` };
  }
}

class ServiceBusQueue implements MessageQueue {
  readonly provider = 'azure';
  #sequence = 0;

  publish(body: string): PublishedMessage {
    this.#sequence += 1;
    return { provider: this.provider, id: `sb-${this.#sequence}`, body };
  }
}

export class AzureFactory implements CloudProviderFactory {
  readonly #account: string;

  constructor(account: string) {
    this.#account = account;
  }

  createStorage(): ObjectStorage {
    return new BlobStorage(this.#account);
  }

  createQueue(): MessageQueue {
    return new ServiceBusQueue();
  }
}
