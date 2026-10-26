import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CloudProviderFactory } from './cloud-provider-factory.ts';
import { AwsFactory } from './families/aws.ts';
import { AzureFactory } from './families/azure.ts';
import { ReportPublisher } from './report-publisher.ts';

const families: Array<[string, CloudProviderFactory]> = [
  ['aws', new AwsFactory('sa-east-1')],
  ['azure', new AzureFactory('relatorios')],
];

describe('Abstract Factory', () => {
  for (const [provider, factory] of families) {
    it(`${provider}: todos os produtos criados pertencem à mesma família`, () => {
      assert.equal(factory.createStorage().provider, provider);
      assert.equal(factory.createQueue().provider, provider);
    });

    it(`${provider}: o client publica usando apenas a família injetada`, () => {
      const message = new ReportPublisher(factory).publish('vendas', 'a,b');
      const event = JSON.parse(message.body) as { url: string };

      assert.equal(message.provider, provider);
      assert.match(event.url, /vendas\.csv$/);
    });
  }

  it('cada fábrica entrega URLs no formato do seu provedor', () => {
    assert.equal(
      new AwsFactory('us-east-1').createStorage().upload('r.csv', '').url,
      'https://reports.s3.us-east-1.amazonaws.com/r.csv',
    );
    assert.equal(
      new AzureFactory('acme').createStorage().upload('r.csv', '').url,
      'https://acme.blob.core.windows.net/reports/r.csv',
    );
  });
});
