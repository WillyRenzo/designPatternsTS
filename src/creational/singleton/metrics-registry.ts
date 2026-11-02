import { Counter } from './counter.ts';

// `private constructor` só existe para o compilador; em runtime, `new` funcionaria.
// O token, privado deste módulo, faz a proteção valer também em JavaScript.
const CONSTRUCTION_TOKEN = Symbol('MetricsRegistry');
const METRIC_NAME = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;

// Singleton: uma única instância por processo, acessível de qualquer módulo.
// Duas instâncias significariam métricas espalhadas e um /metrics incompleto.
export class MetricsRegistry {
  static #instance: MetricsRegistry | undefined;
  readonly #counters = new Map<string, Counter>();

  private constructor(token: symbol) {
    if (token !== CONSTRUCTION_TOKEN) throw new Error('use MetricsRegistry.getInstance()');
  }

  // Criação preguiçosa: a instância nasce no primeiro acesso, não no import.
  static getInstance(): MetricsRegistry {
    MetricsRegistry.#instance ??= new MetricsRegistry(CONSTRUCTION_TOKEN);
    return MetricsRegistry.#instance;
  }

  // Custo do padrão: o estado é global e sobrevive entre testes. Sem este gancho,
  // um teste veria as métricas do anterior.
  static resetForTests(): void {
    MetricsRegistry.#instance = undefined;
  }

  // Get-or-create: módulos diferentes podem declarar a mesma métrica e somam na mesma série.
  counter(name: string, help: string): Counter {
    if (!METRIC_NAME.test(name)) throw new Error(`nome de métrica inválido: ${name}`);

    const existing = this.#counters.get(name);
    if (existing) {
      if (existing.help !== help) throw new Error(`métrica ${name} já registrada com outra descrição`);
      return existing;
    }
    const counter = new Counter(name, help);
    this.#counters.set(name, counter);
    return counter;
  }

  // Corpo da resposta de GET /metrics.
  render(): string {
    return [...this.#counters.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((counter) => counter.render())
      .join('\n\n');
  }
}
