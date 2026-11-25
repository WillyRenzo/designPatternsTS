import { type Inventory, OutOfStockError, type StockLine } from './subsystem/inventory.ts';
import { MailDeliveryError, type Mailer } from './subsystem/mailer.ts';
import { PaymentDeclinedError, type PaymentProcessor } from './subsystem/payment-processor.ts';
import type { ProductCatalog } from './subsystem/product-catalog.ts';
import { CarrierUnavailableError, InvalidAddressError, type ShippingService } from './subsystem/shipping-service.ts';

export interface CheckoutRequest {
  readonly customerEmail: string;
  readonly items: readonly StockLine[];
  readonly zip: string;
  readonly cardToken: string;
}

export interface OrderReceipt {
  readonly orderId: string;
  readonly subtotalCents: number;
  readonly shippingCents: number;
  readonly totalCents: number;
  readonly trackingCode: string;
  readonly confirmationSent: boolean;
}

export type CheckoutFailure =
  | 'invalid_cart'
  | 'unknown_product'
  | 'out_of_stock'
  | 'invalid_address'
  | 'payment_declined'
  | 'shipping_unavailable';

// O único erro que o client precisa conhecer. O erro original do subsistema
// fica em `cause`.
export class CheckoutError extends Error {
  override readonly name = 'CheckoutError';
  readonly reason: CheckoutFailure;

  constructor(reason: CheckoutFailure, message: string, options?: ErrorOptions) {
    super(message, options);
    this.reason = reason;
  }
}

export interface CheckoutSubsystem {
  readonly catalog: ProductCatalog;
  readonly inventory: Inventory;
  readonly payments: PaymentProcessor;
  readonly shipping: ShippingService;
  readonly mailer: Mailer;
}

// Facade: um método para o caso de uso inteiro. Conhece a ordem dos passos,
// desfaz o que já foi feito quando um passo falha e traduz os erros.
export class CheckoutFacade {
  readonly #subsystem: CheckoutSubsystem;
  #sequence = 0;

  constructor(subsystem: CheckoutSubsystem) {
    this.#subsystem = subsystem;
  }

  placeOrder(request: CheckoutRequest): OrderReceipt {
    const { inventory, payments, shipping } = this.#subsystem;
    const subtotalCents = this.#subtotal(request.items);
    this.#sequence += 1;
    const orderId = `order-${this.#sequence}`;

    // Cada passo que muda estado registra como se desfaz. Na falha, desfaz do último para o primeiro.
    const compensations: Array<() => void> = [];
    let shippingCents: number;
    let trackingCode: string;
    try {
      shippingCents = shipping.quote(request.zip, subtotalCents);
      const reservation = inventory.reserve(request.items);
      compensations.push(() => inventory.release(reservation));
      const chargeId = payments.charge(subtotalCents + shippingCents, request.cardToken);
      compensations.push(() => payments.refund(chargeId));
      trackingCode = shipping.createLabel(orderId, request.zip);
      inventory.commit(reservation);
    } catch (error) {
      for (const undo of compensations.reverse()) undo();
      throw translate(error);
    }

    const receipt = { orderId, subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents, trackingCode };
    return { ...receipt, confirmationSent: this.#sendConfirmation(request.customerEmail, receipt) };
  }

  #subtotal(items: readonly StockLine[]): number {
    if (items.length === 0) throw new CheckoutError('invalid_cart', 'carrinho vazio');
    let subtotal = 0;
    for (const { sku, quantity } of items) {
      if (!Number.isSafeInteger(quantity) || quantity < 1) throw new CheckoutError('invalid_cart', `quantidade inválida para ${sku}: ${quantity}`);
      const product = this.#subsystem.catalog.find(sku);
      if (!product) throw new CheckoutError('unknown_product', `produto desconhecido: ${sku}`);
      subtotal += product.priceCents * quantity;
    }
    return subtotal;
  }

  // Melhor esforço: o pedido já está pago e despachado; um bounce não o desfaz.
  #sendConfirmation(to: string, receipt: Omit<OrderReceipt, 'confirmationSent'>): boolean {
    try {
      this.#subsystem.mailer.send({
        to,
        subject: `Pedido ${receipt.orderId} confirmado`,
        body: `Total: ${receipt.totalCents} centavos. Rastreio: ${receipt.trackingCode}.`,
      });
      return true;
    } catch (error) {
      if (error instanceof MailDeliveryError) return false;
      throw error;
    }
  }
}

const FAILURES: ReadonlyArray<[new (...args: never[]) => Error, CheckoutFailure]> = [
  [OutOfStockError, 'out_of_stock'],
  [InvalidAddressError, 'invalid_address'],
  [PaymentDeclinedError, 'payment_declined'],
  [CarrierUnavailableError, 'shipping_unavailable'],
];

// Só erros conhecidos do subsistema viram CheckoutError; bug continua sendo bug.
function translate(error: unknown): unknown {
  for (const [type, reason] of FAILURES) {
    if (error instanceof type) return new CheckoutError(reason, error.message, { cause: error });
  }
  return error;
}
