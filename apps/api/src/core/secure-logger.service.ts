import { Injectable, Logger } from "@nestjs/common";
import { redactSensitive } from "./redact";

@Injectable()
export class SecureLogger {
  private readonly logger = new Logger("FoxtrotApi");

  log(message: string, context?: Record<string, unknown>) {
    this.logger.log(this.format(message, context));
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.logger.warn(this.format(message, context));
  }

  error(message: string, context?: Record<string, unknown>) {
    this.logger.error(this.format(message, context));
  }

  private format(message: string, context?: Record<string, unknown>) {
    if (!context) return message;
    return `${message} ${JSON.stringify(redactSensitive(context))}`;
  }
}
