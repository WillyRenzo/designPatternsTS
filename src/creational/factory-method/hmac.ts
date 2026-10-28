import { createHmac, timingSafeEqual } from 'node:crypto';

export function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

// Comparação em tempo constante: `===` para no primeiro byte diferente e permite
// descobrir a assinatura byte a byte medindo o tempo de resposta.
export function safeEqual(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
