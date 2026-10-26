import type { CloudProviderFactory } from '../cloud-provider-factory.ts';
import type { MessageQueue, ObjectStorage, PublishedMessage, StoredObject } from '../products.ts';

// Família AWS: ConcreteProducts (S3 + SQS) e a ConcreteFactory que os cria.
// Implementações em memória: o foco é a estrutura do padrão, não o SDK.

class S3Storage implements ObjectStorage {
  readonly provider = 'aws';
  readonly #bucket: string;
  readonly #region: string;
  readonly #objects = new Map<string, string>();

  constructor(bucket: string, region: string) {
    this.#bucket = bucket;
    this.#region = region;
  }

  upload(key: string, content: string): StoredObject {
    this.#objects.set(key, content);
    return { provider: this.provider, url: `https://${this.#bucket}.s3.${this.#region}.amazonaws.com/${key}` };
  }
}

class SqsQueue implements MessageQueue {
  readonly provider = 'aws';
  #sequence = 0;

  publish(body: string): PublishedMessage {
    this.#sequence += 1;
    return { provider: this.provider, id: `sqs-${this.#sequence}`, body };
  }
}

export class AwsFactory implements CloudProviderFactory {
  readonly #region: string;

  constructor(region: string) {
    this.#region = region;
  }

  createStorage(): ObjectStorage {
    return new S3Storage('reports', this.#region);
  }

  createQueue(): MessageQueue {
    return new SqsQueue();
  }
}
