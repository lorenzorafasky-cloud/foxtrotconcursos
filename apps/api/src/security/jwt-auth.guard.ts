import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { AuthUser } from "./auth-user.decorator";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { PERMISSIONS_KEY } from "./permissions.decorator";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException("Token ausente.");

    const payload = await this.jwt.verifyAsync<AuthUser>(token, { secret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret" });
    request.user = payload;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (requiredRoles?.length) {
      const grantedRoles = new Set(payload.roles ?? []);
      if (!requiredRoles.some((role) => grantedRoles.has(role))) {
        throw new ForbiddenException("Papel insuficiente.");
      }
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!requiredPermissions?.length) return true;

    const granted = new Set<string>(payload.permissions ?? []);
    if (requiredPermissions.every((permission) => granted.has(permission))) return true;
    throw new ForbiddenException("Permissao insuficiente.");
  }

  private extractToken(request: Request) {
    const header = request.headers.authorization;
    if (header?.startsWith("Bearer ")) return header.slice(7);
    return request.cookies?.access_token as string | undefined;
  }
}
