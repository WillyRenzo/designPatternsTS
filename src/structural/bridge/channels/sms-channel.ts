import type { ChannelMessage, MessageChannel } from '../message-channel.ts';

export interface SentSms {
  readonly to: string;
  readonly text: string;
}

export const SMS_MAX_LENGTH = 160;

// ConcreteImplementor: SMS não tem assunto nem quebra de linha útil, e tem
// limite de tamanho. Essas regras ficam aqui, longe das notificações.
export class SmsChannel implements MessageChannel {
  readonly name = 'sms';
  readonly #outbox: SentSms[] = [];

  send({ to, title, body, urgent }: ChannelMessage): void {
    const text = `${urgent ? 'URGENTE: ' : ''}${title}. ${body}`.replace(/\s+/g, ' ').trim();
    this.#outbox.push({ to: to.phone, text: truncate(text, SMS_MAX_LENGTH) });
  }

  get outbox(): readonly SentSms[] {
    return [...this.#outbox];
  }
}

// Simplificação: conta caracteres. Na operadora o limite depende da codificação
// (160 em GSM-7, 70 em UCS-2, que é o que acentos como "í" e "ê" exigem).
function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}
