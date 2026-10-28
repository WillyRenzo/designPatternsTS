// Cabeçalhos HTTP com nomes em minúsculas, como chegam do Node.
export type WebhookHeaders = Readonly<Record<string, string>>;

// Product: a interface que o Creator usa, sem saber qual provedor assinou a requisição.
export interface SignatureVerifier {
  verify(rawBody: string, headers: WebhookHeaders): boolean;
}
