import type { CloudProviderFactory } from './cloud-provider-factory.ts';
import { AwsFactory } from './families/aws.ts';
import { AzureFactory } from './families/azure.ts';
import type { ProviderName } from './products.ts';
import { ReportPublisher } from './report-publisher.ts';

// Único ponto que conhece as fábricas concretas. Na vida real a escolha viria da
// configuração do ambiente; aqui rodamos as duas para comparar.
const factories: Record<ProviderName, CloudProviderFactory> = {
  aws: new AwsFactory('sa-east-1'),
  azure: new AzureFactory('relatorios'),
};

for (const [provider, factory] of Object.entries(factories)) {
  const message = new ReportPublisher(factory).publish('vendas-2026-10', 'produto,total\ncafe,42');
  console.log(`[${provider}]`, message);
}
