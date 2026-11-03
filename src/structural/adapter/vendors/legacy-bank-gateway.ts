// Adaptee: simulação da integração legada de um banco. Síncrona, valor em string
// decimal com vírgula ("89,90") e resposta "<código>|<NSU>" com códigos ISO 8583.

// Cartões de teste do banco: o final do número decide a resposta.
const RESPONSE_BY_CARD_SUFFIX: Record<string, string> = {
  '0051': '51', // saldo insuficiente
  '0054': '54', // cartão vencido
  '0059': '59', // suspeita de fraude
  '0091': '91', // emissor indisponível
};

export class LegacyBankGateway {
  #nsu = 100_000;

  autorizar(valor: string, numeroCartao: string, pedido: string): string {
    if (!/^\d+,\d{2}$/.test(valor)) return '30|'; // erro de formato
    if (!pedido) return '30|';

    const code = RESPONSE_BY_CARD_SUFFIX[numeroCartao.slice(-4)] ?? '00';
    if (code !== '00') return `${code}|`;

    this.#nsu += 1;
    return `00|${this.#nsu}`;
  }
}
