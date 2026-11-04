import type { ChannelMessage, MessageChannel } from '../message-channel.ts';

export interface SentEmail {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

// ConcreteImplementor: endereça pelo e-mail, marca urgência no assunto e
// entrega o corpo inteiro.
export class EmailChannel implements MessageChannel {
  readonly name = 'email';
  readonly #outbox: SentEmail[] = [];

  send({ to, title, body, urgent }: ChannelMessage): void {
    this.#outbox.push({
      to: `${to.name} <${to.email}>`,
      subject: urgent ? `[URGENTE] ${title}` : title,
      text: body,
    });
  }

  get outbox(): readonly SentEmail[] {
    return [...this.#outbox];
  }
}
