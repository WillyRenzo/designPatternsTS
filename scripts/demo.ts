import { globSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Uso: npm run demo -- <padrao>   (ex.: npm run demo -- abstract-factory)
const pattern = process.argv[2];
const available = globSync('src/*/*/main.ts').map((path) => path.split(/[\\/]/).at(-2));

const [entry] = pattern ? globSync(`src/*/${pattern}/main.ts`) : [];
if (!entry) {
  console.error(`Padrão ${pattern ? `"${pattern}" não encontrado` : 'não informado'}. Disponíveis: ${available.join(', ')}`);
  process.exit(1);
}

await import(pathToFileURL(entry).href);
