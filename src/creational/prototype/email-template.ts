import { interpolate } from './interpolate.ts';
import type { EmailMessage, NotificationTemplate, TemplateVariables } from './notification-template.ts';

export interface EmailTemplateState {
  readonly from: string;
  readonly subject: string;
  readonly body: string;
  readonly tags?: readonly string[];
}

// ConcretePrototype
export class EmailTemplate implements NotificationTemplate {
  readonly #from: string;
  #subject: string;
  #body: string;
  readonly #tags: string[];

  constructor(state: EmailTemplateState) {
    this.#from = state.from;
    this.#subject = state.subject;
    this.#body = state.body;
    // Cópia do array: é isso que torna o clone profundo. Sem ela, clone e
    // protótipo dividiriam a mesma lista, e addTag() no clone alteraria o protótipo.
    this.#tags = [...(state.tags ?? [])];
  }

  clone(): EmailTemplate {
    return new EmailTemplate({ from: this.#from, subject: this.#subject, body: this.#body, tags: this.#tags });
  }

  fill(variables: TemplateVariables): void {
    this.#subject = interpolate(this.#subject, variables);
    this.#body = interpolate(this.#body, variables);
  }

  addTag(tag: string): void {
    this.#tags.push(tag);
  }

  render(recipient: string): EmailMessage {
    return {
      channel: 'email',
      to: recipient,
      from: this.#from,
      subject: this.#subject,
      text: this.#body,
      tags: [...this.#tags],
    };
  }
}
