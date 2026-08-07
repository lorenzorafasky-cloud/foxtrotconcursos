import { BadRequestException, Controller, Headers, Post, RawBodyRequest, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LessonAssetType, Prisma } from "@foxtrot/database";
import { Request } from "express";
import { PrismaService } from "../../core/prisma.service";
import { QueueService } from "../../core/queue.service";
import { Public } from "../../security/public.decorator";
import { MediaService } from "./media.service";

type StreamWebhookPayload = {
  uid?: string;
  readyToStream?: boolean;
  status?: { state?: string; errorReasonText?: string };
  duration?: number;
  meta?: { lessonId?: string };
  playback?: { hls?: string; dash?: string };
};

/**
 * Webhook do Cloudflare Stream: fecha o ciclo
 * upload -> transcodificacao -> notificacao -> transcricao (worker) -> player.
 */
@ApiTags("media")
@Controller("media")
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly prisma: PrismaService,
    private readonly queue: QueueService
  ) {}

  @Public()
  @Post("webhooks/stream")
  async streamWebhook(@Req() request: RawBodyRequest<Request>, @Headers("webhook-signature") signature?: string) {
    const rawBody = request.rawBody ?? Buffer.from(JSON.stringify(request.body ?? {}));
    this.media.verifyStreamWebhook(rawBody, signature);

    const payload = request.body as StreamWebhookPayload;
    const videoUid = payload.uid;
    if (!videoUid) throw new BadRequestException("Payload sem uid do video.");

    const lesson = payload.meta?.lessonId
      ? await this.prisma.lesson.findUnique({ where: { id: payload.meta.lessonId } })
      : await this.prisma.lesson.findFirst({ where: { streamVideoUid: videoUid } });
    if (!lesson) {
      // Video sem aula associada: reconhece o webhook sem reprocessar.
      return { received: true, matched: false };
    }

    const state = payload.status?.state ?? (payload.readyToStream ? "ready" : "unknown");

    if (state === "ready" || payload.readyToStream) {
      const durationSeconds = payload.duration ? Math.round(payload.duration) : lesson.durationSeconds;
      await this.prisma.lesson.update({
        where: { id: lesson.id },
        data: { streamVideoUid: videoUid, durationSeconds: durationSeconds ?? undefined }
      });
      await this.upsertAsset(lesson.id, LessonAssetType.VIDEO, `stream://${videoUid}`, {
        status: "ready",
        videoUid,
        durationSeconds,
        readyAt: new Date().toISOString()
      });
      await this.upsertAsset(lesson.id, LessonAssetType.THUMBNAIL, this.media.streamThumbnailUrl(videoUid), {
        source: "cloudflare-stream",
        videoUid
      });
      await this.queue.enqueue("media", "transcribe", { lessonId: lesson.id, videoUid });
      return { received: true, matched: true, state: "ready" };
    }

    if (state === "error") {
      await this.upsertAsset(lesson.id, LessonAssetType.VIDEO, `stream://${videoUid}`, {
        status: "error",
        videoUid,
        error: payload.status?.errorReasonText ?? "Falha na transcodificacao."
      });
      return { received: true, matched: true, state: "error" };
    }

    return { received: true, matched: true, state };
  }

  private async upsertAsset(lessonId: string, type: LessonAssetType, url: string, metadata: Record<string, unknown>) {
    const existing = await this.prisma.lessonAsset.findFirst({ where: { lessonId, type } });
    if (existing) {
      await this.prisma.lessonAsset.update({
        where: { id: existing.id },
        data: { url, metadata: metadata as Prisma.InputJsonValue }
      });
      return;
    }
    await this.prisma.lessonAsset.create({
      data: { lessonId, type, url, metadata: metadata as Prisma.InputJsonValue }
    });
  }
}
