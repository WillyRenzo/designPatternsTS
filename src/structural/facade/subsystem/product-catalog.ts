export interface CatalogProduct {
  readonly name: string;
  readonly priceCents: number;
}

// Subsistema: preços oficiais. O checkout nunca confia no preço que vem do client.
export class ProductCatalog {
  readonly #products: ReadonlyMap<string, CatalogProduct>;

  constructor(products: Readonly<Record<string, CatalogProduct>>) {
    this.#products = new Map(Object.entries(products));
  }

  find(sku: string): CatalogProduct | undefined {
    return this.#products.get(sku);
  }
}
