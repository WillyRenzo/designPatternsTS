import { hmacSha256Hex, safeEqual } from './hmac.ts';
import type { SignatureVerifier, WebhookHeaders } from './signature-verifier.ts';
import { WebhookReceiver } from './webhook-receiver.ts';

// ConcreteProduct: cabeçalho `x-hub-signature-256: sha256=<hmac>`, com o HMAC
// calculado sobre o corpo cru.
class GitHubSignatureVerifier implements SignatureVerifier {
  readonly #secret: string;

  constructor(secret: string) {
    this.#secret = secret;
  }

  verify(rawBody: string, headers: WebhookHeaders): boolean {
    const header = headers['x-hub-signature-256'];
    if (!header?.startsWith('sha256=')) return false;

    const expected = hmacSha256Hex(this.#secret, rawBody);
    return safeEqual(header.slice('sha256='.length), expected);
  }
}

// ConcreteCreator
export class GitHubWebhookReceiver extends WebhookReceiver {
  readonly #secret: string;

  constructor(secret: string) {
    super();
    this.#secret = secret;
  }

  protected override createVerifier(): SignatureVerifier {
    return new GitHubSignatureVerifier(this.#secret);
  }
}
