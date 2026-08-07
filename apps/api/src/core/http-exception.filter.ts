import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";
import { safeErrorMessage } from "./redact";
import { SecureLogger } from "./secure-logger.service";

type ErrorBody = {
  statusCode: number;
  code: string;
  message: string | string[];
  path: string;
  requestId?: string;
  timestamp: string;
};

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  constructor(private readonly logger: SecureLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request & { requestId?: string }>();
    const response = context.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : undefined;
    const body = this.buildBody(status, request, payload, exception);

    if (status >= 500) {
      this.logger.error("Erro nao tratado na API.", {
        requestId: body.requestId,
        method: request.method,
        path: request.path,
        status,
        error: safeErrorMessage(exception)
      });
    } else {
      this.logger.warn("Requisicao recusada pela API.", {
        requestId: body.requestId,
        method: request.method,
        path: request.path,
        status
      });
    }

    response.status(status).json(body);
  }

  private buildBody(
    status: number,
    request: Request & { requestId?: string },
    payload: string | object | undefined,
    exception: unknown
  ): ErrorBody {
    const extracted = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
    const message = typeof extracted.message === "string" || Array.isArray(extracted.message)
      ? extracted.message
      : status >= 500
        ? "Erro interno."
        : typeof payload === "string"
          ? payload
          : safeErrorMessage(exception);

    return {
      statusCode: status,
      code: typeof extracted.error === "string" ? extracted.error : this.defaultCode(status),
      message,
      path: request.path,
      requestId: request.requestId,
      timestamp: new Date().toISOString()
    };
  }

  private defaultCode(status: number) {
    if (status === HttpStatus.UNAUTHORIZED) return "Unauthorized";
    if (status === HttpStatus.FORBIDDEN) return "Forbidden";
    if (status === HttpStatus.BAD_REQUEST) return "Bad Request";
    return status >= 500 ? "Internal Server Error" : "Http Error";
  }
}
