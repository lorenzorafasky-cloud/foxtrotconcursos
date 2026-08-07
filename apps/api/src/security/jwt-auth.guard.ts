import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { PERMISSIONS_KEY } from "./permissions.decorator";

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

    const payload = await this.jwt.verifyAsync(token, {
      secret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret"
    });
    request.user = payload;

    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!required?.length) return true;

    const granted = new Set<string>(payload.permissions ?? []);
    if (required.every((permission) => granted.has(permission))) return true;
    throw new UnauthorizedException("Permissao insuficiente.");
  }

  private extractToken(request: Request) {
    const header = request.headers.authorization;
    if (header?.startsWith("Bearer ")) return header.slice(7);
    return request.cookies?.access_token as string | undefined;
  }
}
