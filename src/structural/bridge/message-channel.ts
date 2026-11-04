export interface Contact {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly slackUserId: string;
}

// O que toda notificação entrega ao canal: só conteúdo e prioridade, sem
// saber como o canal endereça, formata ou limita a mensagem.
export interface ChannelMessage {
  readonly to: Contact;
  readonly title: string;
  readonly body: string;
  readonly urgent: boolean;
}

// Implementor: a operação primitiva de envio. As notificações (Abstraction)
// constroem operações de alto nível em cima dela.
export interface MessageChannel {
  readonly name: string;
  send(message: ChannelMessage): void;
}
