export interface Email {
  readonly to: string;
  readonly subject: string;
  readonly body: string;
}

export class MailDeliveryError extends Error {
  override readonly name = 'MailDeliveryError';
}

// Subsistema: envio de e-mail. Endereços em "@invalid" simulam um bounce.
export class Mailer {
  readonly #outbox: Email[] = [];

  send(email: Email): void {
    if (email.to.endsWith('@invalid')) throw new MailDeliveryError(`bounce para ${email.to}`);
    this.#outbox.push(email);
  }

  get outbox(): readonly Email[] {
    return [...this.#outbox];
  }
}
