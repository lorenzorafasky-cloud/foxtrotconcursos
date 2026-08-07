import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { SecureLogger } from "../../core/secure-logger.service";

type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

@Injectable()
export class MailerService {
  constructor(private readonly logger: SecureLogger) {}

  async sendEmailVerification(to: string, url: string) {
    await this.send({
      to,
      subject: "Confirme seu e-mail na Foxtrot Concursos",
      text: `Confirme seu e-mail acessando: ${url}`,
      html: `<p>Confirme seu e-mail para ativar sua conta na Foxtrot Concursos.</p><p><a href="${url}">Confirmar e-mail</a></p>`
    });
  }

  async sendPasswordReset(to: string, url: string) {
    await this.send({
      to,
      subject: "Redefinicao de senha da Foxtrot Concursos",
      text: `Redefina sua senha acessando: ${url}`,
      html: `<p>Recebemos um pedido de redefinicao de senha.</p><p><a href="${url}">Redefinir senha</a></p>`
    });
  }

  private async send(message: MailMessage) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.log("Envio de e-mail ignorado porque RESEND_API_KEY nao esta configurada.", {
        to: message.to,
        subject: message.subject
      });
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM ?? "Foxtrot Concursos <contato@foxtrotconcursos.com.br>",
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text
      })
    });

    if (!response.ok) {
      this.logger.warn("Provedor recusou envio de e-mail transacional.", {
        to: message.to,
        subject: message.subject,
        status: response.status
      });
      throw new ServiceUnavailableException("Nao foi possivel enviar o e-mail agora.");
    }
  }
}
