import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { AuthUser } from "../../security/auth-user.decorator";

type SubscribePayload = { channel: "leaderboard"; scope?: string };

/**
 * Tempo real via Socket.io (Secao 3/11 do Prompt Mestre).
 * Autenticacao no handshake: token JWT via `auth.token`, header
 * Authorization ou cookie `access_token`. Cada usuario entra na sala
 * `user:{id}`; salas de leaderboard (`leaderboard:global`,
 * `leaderboard:exam:{id}`) sao opt-in via evento `subscribe`.
 */
@WebSocketGateway({
  namespace: "/realtime",
  cors: {
    origin: (process.env.CORS_ORIGINS ?? "http://localhost:3100,http://localhost:3101,http://localhost:3102").split(","),
    credentials: true
  }
})
export class GamificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GamificationGateway.name);

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) throw new Error("Token ausente.");
      const payload = await this.jwt.verifyAsync<AuthUser>(token, {
        secret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret"
      });
      client.data.user = payload;
      await client.join(`user:${payload.id}`);
      client.emit("connected", { userId: payload.id });
    } catch (error) {
      this.logger.warn(`Conexao websocket recusada: ${error instanceof Error ? error.message : String(error)}`);
      client.emit("error", { message: "Nao autorizado." });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    client.data.user = undefined;
  }

  @SubscribeMessage("subscribe")
  async subscribe(@ConnectedSocket() client: Socket, @MessageBody() payload: SubscribePayload) {
    if (!client.data.user) return { ok: false };
    if (payload?.channel !== "leaderboard") return { ok: false };
    const scope = sanitizeScope(payload.scope);
    await client.join(`leaderboard:${scope}`);
    return { ok: true, room: `leaderboard:${scope}` };
  }

  @SubscribeMessage("unsubscribe")
  async unsubscribe(@ConnectedSocket() client: Socket, @MessageBody() payload: SubscribePayload) {
    if (payload?.channel !== "leaderboard") return { ok: false };
    const scope = sanitizeScope(payload.scope);
    await client.leave(`leaderboard:${scope}`);
    return { ok: true };
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server?.to(`user:${userId}`).emit(event, data);
  }

  emitLeaderboard(scope: string, data: unknown) {
    this.server?.to(`leaderboard:${scope}`).emit("leaderboard", data);
  }

  private extractToken(client: Socket) {
    const auth = client.handshake.auth?.token;
    if (typeof auth === "string" && auth.length > 0) return auth;
    const header = client.handshake.headers.authorization;
    if (header?.startsWith("Bearer ")) return header.slice(7);
    const cookies = client.handshake.headers.cookie;
    if (cookies) {
      const match = cookies.match(/(?:^|;\s*)access_token=([^;]+)/);
      if (match?.[1]) return decodeURIComponent(match[1]);
    }
    return null;
  }
}

function sanitizeScope(scope?: string) {
  if (!scope || scope === "global") return "global";
  if (/^exam:[A-Za-z0-9_-]+$/.test(scope)) return scope;
  return "global";
}
