// AbstractProducts: as interfaces que o Client conhece. Cada família concreta
// (AWS, Azure) fornece a sua implementação de cada uma delas.

export type ProviderName = 'aws' | 'azure';

export interface StoredObject {
  readonly provider: ProviderName;
  readonly url: string;
}

export interface ObjectStorage {
  readonly provider: ProviderName;
  upload(key: string, content: string): StoredObject;
}

export interface PublishedMessage {
  readonly provider: ProviderName;
  readonly id: string;
  readonly body: string;
}

export interface MessageQueue {
  readonly provider: ProviderName;
  publish(body: string): PublishedMessage;
}
