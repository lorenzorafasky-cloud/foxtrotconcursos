import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../../core/prisma.service";
import { RequirePermissions } from "../../security/permissions.decorator";

@ApiTags("future")
@Controller("future")
export class FutureController {
  constructor(private readonly prisma: PrismaService) {}

  @RequirePermissions("admin:manage-content")
  @Get("psychology/professionals")
  psychologyProfessionals() {
    return this.prisma.psychologyProfessional.findMany({ include: { sessions: true } });
  }

  @RequirePermissions("admin:manage-content")
  @Post("psychology/professionals")
  createPsychologyProfessional(@Body() body: { name: string; crp: string; bio: string }) {
    return this.prisma.psychologyProfessional.create({ data: body });
  }

  @Get("mental-support")
  mentalSupport() {
    return this.prisma.mentalSupportContent.findMany({ where: { publishedAt: { not: null } } });
  }

  @RequirePermissions("admin:manage-content")
  @Post("mental-support")
  createMentalSupport(@Body() body: { title: string; body: string; category: string; published?: boolean }) {
    return this.prisma.mentalSupportContent.create({
      data: { title: body.title, body: body.body, category: body.category, publishedAt: body.published ? new Date() : null }
    });
  }

  @Get("recreio/rooms")
  recreioRooms() {
    return this.prisma.recreioRoom.findMany({ where: { isOpen: true } });
  }

  @RequirePermissions("admin:manage-content")
  @Post("live-classes")
  createLiveClass(@Body() body: { title: string; lessonId?: string; provider: string; externalId?: string; scheduledAt: string }) {
    return this.prisma.liveClass.create({
      data: { ...body, scheduledAt: new Date(body.scheduledAt) }
    });
  }
}
