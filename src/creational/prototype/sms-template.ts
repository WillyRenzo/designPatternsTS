import { interpolate } from './interpolate.ts';
import type { NotificationTemplate, SmsMessage, TemplateVariables } from './notification-template.ts';

export interface SmsTemplateState {
  readonly senderId: string;
  readonly text: string;
  readonly tags?: readonly string[];
}

// ConcretePrototype
export class SmsTemplate implements NotificationTemplate {
  readonly #senderId: string;
  #text: string;
  readonly #tags: string[];

  constructor(state: SmsTemplateState) {
    this.#senderId = state.senderId;
    this.#text = state.text;
    this.#tags = [...(state.tags ?? [])];
  }

  clone(): SmsTemplate {
    return new SmsTemplate({ senderId: this.#senderId, text: this.#text, tags: this.#tags });
  }

  fill(variables: TemplateVariables): void {
    this.#text = interpolate(this.#text, variables);
  }

  addTag(tag: string): void {
    this.#tags.push(tag);
  }

  render(recipient: string): SmsMessage {
    return { channel: 'sms', to: recipient, senderId: this.#senderId, text: this.#text, tags: [...this.#tags] };
  }
}
