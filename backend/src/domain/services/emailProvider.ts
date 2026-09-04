import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

export interface SendResult {
  status: "SENT" | "FAILED";
  providerMessageId?: string;
  errorMessage?: string;
}

export interface EmailProvider {
  send(input: { to: string; subject: string; html: string }): Promise<SendResult>;
}

// Never contacts a real mail server. Used by default in dev/tests so an
// application bug can never spam real students — see spec section 44/72.
class MockEmailProvider implements EmailProvider {
  async send(input: { to: string; subject: string; html: string }): Promise<SendResult> {
    logger.info({ to: input.to, subject: input.subject }, "[mock-email] would send email");
    return { status: "SENT", providerMessageId: `mock-${Date.now()}-${Math.random().toString(36).slice(2)}` };
  }
}

class SmtpEmailProvider implements EmailProvider {
  private transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
  });

  async send(input: { to: string; subject: string; html: string }): Promise<SendResult> {
    try {
      const info = await this.transporter.sendMail({
        from: env.emailFrom,
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
      return { status: "SENT", providerMessageId: info.messageId };
    } catch (err) {
      return { status: "FAILED", errorMessage: err instanceof Error ? err.message : "Unknown SMTP error" };
    }
  }
}

export function getEmailProvider(): EmailProvider {
  return env.emailMode === "smtp" ? new SmtpEmailProvider() : new MockEmailProvider();
}
