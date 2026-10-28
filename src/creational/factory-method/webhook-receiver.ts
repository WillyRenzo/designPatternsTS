import type { SignatureVerifier, WebhookHeaders } from './signature-verifier.ts';

export class InvalidSignatureError extends Error {
  override readonly name = 'InvalidSignatureError';
}

// Creator: o algoritmo de recebimento é fixo e mora aqui. Qual verificador usar
// é decidido pelas subclasses, no factory method createVerifier().
export abstract class WebhookReceiver {
  #verifier: SignatureVerifier | undefined;

  receive(rawBody: string, headers: WebhookHeaders): unknown {
    // Criação preguiçosa: chamar createVerifier() no construtor rodaria antes de a
    // subclasse inicializar seus campos (ex.: o segredo), e o verificador nasceria quebrado.
    this.#verifier ??= this.createVerifier();

    if (!this.#verifier.verify(rawBody, headers)) {
      throw new InvalidSignatureError('assinatura do webhook inválida');
    }
    return JSON.parse(rawBody);
  }

  protected abstract createVerifier(): SignatureVerifier;
}
