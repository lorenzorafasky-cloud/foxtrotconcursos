import { createHmac, createSign, timingSafeEqual } from "node:crypto";
import { Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { LessonAssetType } from "@foxtrot/database";

type StreamTokenPayload = {
  sub: string;
  kid: string;
  exp: number;
  accessRules?: Array<{ type: string; action: string; country?: string[] }>;
};

type LessonAssetForDownload = {
  id: string;
  type: LessonAssetType;
  url: string;
  metadata?: unknown;
};

@Injectable()
export class MediaService {
  createStreamPlayback(videoUid: string, expiresInSeconds = 3600) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const keyId = process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID;
    const privateKey = process.env.CLOUDFLARE_STREAM_SIGNING_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!accountId || !keyId || !privateKey) {
      throw new ServiceUnavailableException("Credenciais Cloudflare Stream nao configuradas.");
    }

    const token = this.signJwt(
      {
        sub: videoUid,
        kid: keyId,
        exp: Math.floor(Date.now() / 1000) + expiresInSeconds
      },
      privateKey
    );

    return {
      videoUid,
      token,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      iframeUrl: `https://customer-${accountId}.cloudflarestream.com/${videoUid}/iframe?token=${token}`
    };
  }

  createMaterialDownload(asset: LessonAssetForDownload, expiresInSeconds = 900) {
    if (!this.isDownloadable(asset.metadata)) {
      return {
        allowed: false,
        reason: "Download nao permitido para este material."
      };
    }

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    if (asset.url.startsWith("http://") || asset.url.startsWith("https://")) {
      return {
        allowed: true,
        provider: "public-url",
        assetId: asset.id,
        type: asset.type,
        url: asset.url,
        expiresAt
      };
    }

    const r2Object = this.parseR2Url(asset.url);
    if (r2Object) {
      const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, "");
      if (!publicBaseUrl) {
        throw new ServiceUnavailableException("Armazenamento de materiais nao configurado para download.");
      }
      return {
        allowed: true,
        provider: "cloudflare-r2",
        assetId: asset.id,
        type: asset.type,
        url: `${publicBaseUrl}/${encodeURI(r2Object.key)}`,
        expiresAt
      };
    }

    throw new ServiceUnavailableException("Tipo de armazenamento de material nao suportado.");
  }

  describeStorage(url: string) {
    const r2Object = this.parseR2Url(url);
    if (r2Object) return { provider: "cloudflare-r2", bucket: r2Object.bucket, key: r2Object.key };
    if (url.startsWith("http://") || url.startsWith("https://")) return { provider: "public-url" };
    return { provider: "unknown" };
  }

  /**
   * Cria um Direct Creator Upload no Cloudflare Stream (professor envia o
   * arquivo direto para a Cloudflare, sem passar pela API).
   */
  async createDirectUpload(lessonId: string, creatorId: string, maxDurationSeconds = 4 * 60 * 60) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !apiToken) {
      throw new ServiceUnavailableException("Credenciais da API Cloudflare nao configuradas para upload de video.");
    }

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        maxDurationSeconds,
        requireSignedURLs: true,
        creator: creatorId,
        meta: { lessonId }
      })
    });
    if (!response.ok) {
      throw new ServiceUnavailableException("Cloudflare Stream recusou a criacao do upload.");
    }
    const payload = (await response.json()) as {
      success: boolean;
      result?: { uploadURL: string; uid: string };
      errors?: Array<{ message: string }>;
    };
    if (!payload.success || !payload.result) {
      throw new ServiceUnavailableException(payload.errors?.[0]?.message ?? "Falha ao criar upload no Cloudflare Stream.");
    }
    return {
      lessonId,
      videoUid: payload.result.uid,
      uploadUrl: payload.result.uploadURL,
      expiresInSeconds: 30 * 60
    };
  }

  /**
   * Valida a assinatura do webhook do Cloudflare Stream
   * (header `Webhook-Signature: time=<unix>,sig1=<hmac-sha256-hex>`).
   */
  verifyStreamWebhook(rawBody: Buffer | string, signatureHeader?: string, toleranceSeconds = 300) {
    const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
    if (!secret) {
      throw new ServiceUnavailableException("CLOUDFLARE_STREAM_WEBHOOK_SECRET nao configurado.");
    }
    if (!signatureHeader) throw new UnauthorizedException("Assinatura do webhook ausente.");

    const parts = new Map(
      signatureHeader.split(",").map((part) => {
        const [key, ...rest] = part.trim().split("=");
        return [key, rest.join("=")] as const;
      })
    );
    const time = parts.get("time");
    const signature = parts.get("sig1");
    if (!time || !signature) throw new UnauthorizedException("Assinatura do webhook invalida.");

    const age = Math.abs(Math.floor(Date.now() / 1000) - Number(time));
    if (!Number.isFinite(age) || age > toleranceSeconds) {
      throw new UnauthorizedException("Webhook expirado.");
    }

    const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    const expected = createHmac("sha256", secret).update(`${time}.${body}`).digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(signature, "hex");
    if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
      throw new UnauthorizedException("Assinatura do webhook nao confere.");
    }
    return true;
  }

  streamThumbnailUrl(videoUid: string) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    return accountId
      ? `https://customer-${accountId}.cloudflarestream.com/${videoUid}/thumbnails/thumbnail.jpg`
      : `https://videodelivery.net/${videoUid}/thumbnails/thumbnail.jpg`;
  }

  private isDownloadable(metadata: unknown) {
    if (!metadata || typeof metadata !== "object") return true;
    const value = (metadata as { downloadable?: unknown }).downloadable;
    return value !== false;
  }

  private parseR2Url(url: string) {
    if (!url.startsWith("r2://")) return null;
    const withoutProtocol = url.slice("r2://".length);
    const [bucket, ...keyParts] = withoutProtocol.split("/");
    const key = keyParts.join("/");
    if (!bucket || !key) return null;
    return { bucket, key };
  }

  private signJwt(payload: StreamTokenPayload, privateKey: string) {
    const header = { alg: "RS256", typ: "JWT", kid: payload.kid };
    const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
    const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey);
    return `${unsigned}.${base64Url(signature)}`;
  }
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
