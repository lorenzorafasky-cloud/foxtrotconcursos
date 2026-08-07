import { createSign } from "node:crypto";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
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
