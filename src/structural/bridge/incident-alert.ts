import type { Contact } from './message-channel.ts';
import { Notification } from './notification.ts';

export interface Incident {
  readonly service: string;
  readonly severity: 'critical' | 'warning';
  readonly summary: string;
  readonly runbookUrl: string;
}

const SEVERITY_LABEL: Readonly<Record<Incident['severity'], string>> = {
  critical: 'CRÍTICO',
  warning: 'ATENÇÃO',
};

// RefinedAbstraction: decide o que um alerta diz, para quem vai e quando é
// urgente. Funciona igual com qualquer canal.
export class IncidentAlert extends Notification {
  raise(onCall: readonly Contact[], incident: Incident): void {
    if (onCall.length === 0) throw new Error(`incidente em ${incident.service} sem ninguém de plantão`);

    const title = `[${SEVERITY_LABEL[incident.severity]}] ${incident.service}: ${incident.summary}`;
    const body = `Runbook: ${incident.runbookUrl}`;
    for (const contact of onCall) {
      this.deliver(contact, title, body, incident.severity === 'critical');
    }
  }
}
