export type Labels = Readonly<Record<string, string>>;

// Contador monotônico no formato do Prometheus. Não é participante do padrão:
// é o que o Singleton guarda.
export class Counter {
  readonly name: string;
  readonly help: string;
  readonly #values = new Map<string, number>();

  constructor(name: string, help: string) {
    this.name = name;
    this.help = help;
  }

  inc(labels: Labels = {}, value = 1): void {
    if (value < 0) throw new Error(`contador só cresce: ${this.name} recebeu ${value}`);
    const key = serializeLabels(labels);
    this.#values.set(key, (this.#values.get(key) ?? 0) + value);
  }

  get(labels: Labels = {}): number {
    return this.#values.get(serializeLabels(labels)) ?? 0;
  }

  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];
    for (const [labels, value] of [...this.#values].sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`${this.name}${labels} ${value}`);
    }
    return lines.join('\n');
  }
}

// Labels em ordem alfabética: {a,b} e {b,a} são a mesma série.
function serializeLabels(labels: Labels): string {
  const pairs = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}="${escapeLabelValue(value)}"`);
  return pairs.length ? `{${pairs.join(',')}}` : '';
}

// Escapes exigidos pelo formato de exposição do Prometheus.
function escapeLabelValue(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
}
