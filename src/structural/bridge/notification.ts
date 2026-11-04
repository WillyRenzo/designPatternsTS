import type { Contact, MessageChannel } from './message-channel.ts';

// Abstraction: guarda a referência ao Implementor (a "ponte") e oferece às
// subclasses uma operação de entrega. Não sabe qual canal está do outro lado.
export abstract class Notification {
  readonly #channel: MessageChannel;

  constructor(channel: MessageChannel) {
    this.#channel = channel;
  }

  get channelName(): string {
    return this.#channel.name;
  }

  // As subclasses não alcançam #channel: toda entrega passa por aqui.
  protected deliver(to: Contact, title: string, body: string, urgent: boolean): void {
    if (title.trim() === '') throw new Error('notificação sem título');
    this.#channel.send({ to, title, body, urgent });
  }
}
