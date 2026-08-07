import { Controller, Get, MessageEvent, Param, Patch, Post, Query, Sse } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { map, Observable } from "rxjs";
import { AuditAction } from "../../security/audit.decorator";
import { AuthUser, CurrentUser } from "../../security/auth-user.decorator";
import { RequirePermissions } from "../../security/permissions.decorator";
import { GamificationService } from "./gamification.service";

@ApiTags("gamification")
@RequirePermissions("student:use-gamification")
@Controller("gamification")
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Get("dashboard")
  dashboard(@CurrentUser() user: AuthUser) {
    return this.gamification.dashboard(user.id);
  }

  @Get("rules")
  rules() {
    return this.gamification.rules();
  }

  @Get("leaderboard")
  leaderboard(
    @CurrentUser() user: AuthUser,
    @Query("period") period?: "daily" | "weekly" | "all",
    @Query("scope") scope?: "global" | "contest"
  ) {
    return this.gamification.leaderboardForUser(user.id, period ?? "weekly", scope ?? "global");
  }

  @Get("achievements")
  achievements(@CurrentUser() user: AuthUser) {
    return this.gamification.achievements(user.id);
  }

  @Get("challenges")
  challenges(@CurrentUser() user: AuthUser) {
    return this.gamification.challenges(user.id);
  }

  @AuditAction("gamification.challenge.join")
  @Post("challenges/:id/join")
  joinChallenge(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.gamification.joinChallenge(user.id, id);
  }

  @Get("notifications")
  notifications(@CurrentUser() user: AuthUser, @Query("unreadOnly") unreadOnly?: string) {
    return this.gamification.notifications(user.id, unreadOnly === "true");
  }

  @AuditAction("gamification.notification.read")
  @Patch("notifications/:id/read")
  markNotificationRead(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.gamification.markNotificationRead(user.id, id);
  }

  @Sse("stream")
  stream(@CurrentUser() user: AuthUser): Observable<MessageEvent> {
    return this.gamification.stream(user.id).pipe(map((event) => ({ type: event.type, data: event.data })));
  }
}
