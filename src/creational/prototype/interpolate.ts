import type { TemplateVariables } from './notification-template.ts';

// Substitui {{nome}} pelos valores. Variável ausente é erro: mandar "Olá, {{name}}"
// para um cliente é pior do que não mandar nada.
export function interpolate(text: string, variables: TemplateVariables): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
    const value = variables[name];
    if (value === undefined) throw new Error(`variável do template não informada: ${name}`);
    return value;
  });
}
