import type { NotificationTemplate } from './notification-template.ts';

// Prototype Manager do livro: guarda protótipos por nome e entrega sempre um clone.
export class TemplateRegistry {
  readonly #prototypes = new Map<string, NotificationTemplate>();

  // Guarda um clone, não a instância recebida: se quem registrou continuar
  // mexendo no objeto dele, o protótipo registrado não muda.
  register(key: string, prototype: NotificationTemplate): void {
    this.#prototypes.set(key, prototype.clone());
  }

  create(key: string): NotificationTemplate {
    const prototype = this.#prototypes.get(key);
    if (!prototype) throw new Error(`template não registrado: ${key}`);
    return prototype.clone();
  }
}
