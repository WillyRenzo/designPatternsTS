import { hmacSha256Hex, safeEqual } from './hmac.ts';
import type { SignatureVerifier, WebhookHeaders } from './signature-verifier.ts';
import { WebhookReceiver } from './webhook-receiver.ts';

// Janela aceita entre o envio e o recebimento; fora dela, a requisição pode ser um replay.
const TOLERANCE_SECONDS = 300;

// ConcreteProduct: cabeçalho `stripe-signature: t=<unix>,v1=<hmac>`, com o HMAC
// calculado sobre `<t>.<corpo>`. Pode haver mais de um v1 durante a rotação de segredos.
class StripeSignatureVerifier implements SignatureVerifier {
  readonly #secret: string;
  readonly #nowInSeconds: () => number;

  constructor(secret: string, nowInSeconds: () => number) {
    this.#secret = secret;
    this.#nowInSeconds = nowInSeconds;
  }

  verify(rawBody: string, headers: WebhookHeaders): boolean {
    const header = headers['stripe-signature'];
    if (!header) return false;

    const pairs = header.split(',').map((pair) => pair.split('='));
    const timestamp = pairs.find(([key]) => key === 't')?.[1];
    const signatures = pairs.filter(([key]) => key === 'v1').map(([, value]) => value ?? '');
    if (!timestamp || !/^\d+$/.test(timestamp)) return false;
    if (Math.abs(this.#nowInSeconds() - Number(timestamp)) > TOLERANCE_SECONDS) return false;

    const expected = hmacSha256Hex(this.#secret, `${timestamp}.${rawBody}`);
    return signatures.some((signature) => safeEqual(signature, expected));
  }
}

// ConcreteCreator: só decide qual verificador criar; o fluxo de recebimento é herdado.
export class StripeWebhookReceiver extends WebhookReceiver {
  readonly #secret: string;
  readonly #nowInSeconds: () => number;

  constructor(secret: string, nowInSeconds: () => number) {
    super();
    this.#secret = secret;
    this.#nowInSeconds = nowInSeconds;
  }

  protected override createVerifier(): SignatureVerifier {
    return new StripeSignatureVerifier(this.#secret, this.#nowInSeconds);
  }
}
