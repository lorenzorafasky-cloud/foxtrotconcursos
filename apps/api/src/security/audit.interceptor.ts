import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { Observable, tap } from "rxjs";
import { PrismaService } from "../core/prisma.service";
import { SecureLogger } from "../core/secure-logger.service";
import { AUDIT_ACTION_KEY } from "./audit.decorator";
import { AuthUser } from "./auth-user.decorator";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly logger: SecureLogger
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.getAllAndOverride<string>(AUDIT_ACTION_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!action) return next.handle();

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser; requestId?: string }>();
    const actorId = request.user?.id;
    if (!actorId) return next.handle();

    return next.handle().pipe(
      tap({
        next: () => {
          void this.prisma.auditLog.create({
            data: {
              actorId,
              action,
              entityType: this.entityTypeFromAction(action),
              entityId: this.entityIdFromRequest(request),
              ipAddress: request.ip,
              userAgent: request.header("user-agent"),
              metadata: {
                requestId: request.requestId,
                method: request.method,
                path: request.path
              }
            }
          }).catch((error: unknown) => {
            this.logger.error("Falha ao registrar auditoria.", {
              requestId: request.requestId,
              action,
              error: error instanceof Error ? error.message : "unknown"
            });
          });
        }
      })
    );
  }

  private entityTypeFromAction(action: string) {
    return action.split(".")[0] || "Unknown";
  }

  private entityIdFromRequest(request: Request) {
    const params = request.params as Record<string, string | undefined>;
    return params.id ?? params.subjectId ?? undefined;
  }
}
