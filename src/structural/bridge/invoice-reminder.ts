import type { Contact } from './message-channel.ts';
import { Notification } from './notification.ts';

export interface Invoice {
  readonly id: string;
  readonly amountCents: number;
  // Negativo quando já venceu. Vem pronto para o exemplo não depender do relógio.
  readonly daysUntilDue: number;
}

// RefinedAbstraction: monta o lembrete de cobrança e só marca como urgente a
// fatura vencida. Não sabe se vai por e-mail, SMS ou Slack.
export class InvoiceReminder extends Notification {
  remind(customer: Contact, invoice: Invoice): void {
    const body = `Olá, ${customer.name}. O valor da fatura ${invoice.id} é ${formatBrl(invoice.amountCents)}.`;
    this.deliver(customer, dueTitle(invoice), body, invoice.daysUntilDue < 0);
  }
}

function dueTitle({ id, daysUntilDue }: Invoice): string {
  if (daysUntilDue === 0) return `Fatura ${id} vence hoje`;
  const days = Math.abs(daysUntilDue);
  const unit = days === 1 ? 'dia' : 'dias';
  return daysUntilDue > 0 ? `Fatura ${id} vence em ${days} ${unit}` : `Fatura ${id} venceu há ${days} ${unit}`;
}

// Só aritmética inteira, como no Adapter: 123456 → "R$ 1.234,56".
function formatBrl(cents: number): string {
  const reais = String(Math.trunc(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centavos = String(cents % 100).padStart(2, '0');
  return `R$ ${reais},${centavos}`;
}
