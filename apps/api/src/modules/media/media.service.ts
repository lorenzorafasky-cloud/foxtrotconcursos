import { createSign } from "node:crypto";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";

type StreamTokenPayload = {
  sub: string;
  kid: string;
  exp: number;
  accessRules?: Array<{ type: string; action: string; country?: string[] }>;
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
