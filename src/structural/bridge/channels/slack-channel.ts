import type { ChannelMessage, MessageChannel } from '../message-channel.ts';

export interface SentSlackMessage {
  readonly channel: string;
  readonly text: string;
}

// ConcreteImplementor: mensagem direta pelo ID do usuário, título em negrito
// (mrkdwn do Slack) e emoji de sirene quando é urgente.
export class SlackChannel implements MessageChannel {
  readonly name = 'slack';
  readonly #outbox: SentSlackMessage[] = [];

  send({ to, title, body, urgent }: ChannelMessage): void {
    this.#outbox.push({
      channel: to.slackUserId,
      text: `${urgent ? ':rotating_light: ' : ''}*${title}*\n${body}`,
    });
  }

  get outbox(): readonly SentSlackMessage[] {
    return [...this.#outbox];
  }
}
