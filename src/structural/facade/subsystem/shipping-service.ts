export class InvalidAddressError extends Error {
  override readonly name = 'InvalidAddressError';
}

export class CarrierUnavailableError extends Error {
  override readonly name = 'CarrierUnavailableError';
}

export const FLAT_RATE_CENTS = 1990;
export const FREE_SHIPPING_FROM_CENTS = 30000;

const ZIP_FORMAT = /^\d{5}-?\d{3}$/;

// Subsistema: cotação e etiqueta. CEPs começando com 99 simulam uma
// transportadora fora do ar.
export class ShippingService {
  readonly #labels: Array<{ readonly orderId: string; readonly trackingCode: string }> = [];

  quote(zip: string, subtotalCents: number): number {
    if (!ZIP_FORMAT.test(zip)) throw new InvalidAddressError(`CEP inválido: ${zip}`);
    return subtotalCents >= FREE_SHIPPING_FROM_CENTS ? 0 : FLAT_RATE_CENTS;
  }

  createLabel(orderId: string, zip: string): string {
    if (zip.startsWith('99')) throw new CarrierUnavailableError(`transportadora sem atendimento para ${zip}`);
    const trackingCode = `BR${String(this.#labels.length + 1).padStart(9, '0')}`;
    this.#labels.push({ orderId, trackingCode });
    return trackingCode;
  }

  get labels(): readonly { readonly orderId: string; readonly trackingCode: string }[] {
    return [...this.#labels];
  }
}
