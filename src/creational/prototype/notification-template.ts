export type TemplateVariables = Readonly<Record<string, string>>;

export interface EmailMessage {
  readonly channel: 'email';
  readonly to: string;
  readonly from: string;
  readonly subject: string;
  readonly text: string;
  readonly tags: readonly string[];
}

export interface SmsMessage {
  readonly channel: 'sms';
  readonly to: string;
  readonly senderId: string;
  readonly text: string;
  readonly tags: readonly string[];
}

export type OutgoingMessage = EmailMessage | SmsMessage;

// Prototype: quem tem um template cria outro igual pedindo clone(), sem conhecer a classe.
export interface NotificationTemplate {
  clone(): NotificationTemplate;
  // Inicialização do clone (a "Initialize" do livro): preenche os placeholders.
  fill(variables: TemplateVariables): void;
  addTag(tag: string): void;
  render(recipient: string): OutgoingMessage;
}
