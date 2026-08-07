import { ServiceUnavailableException } from "@nestjs/common";
import { afterEach, describe, expect, it } from "vitest";
import { MediaService } from "../src/modules/media/media.service";

describe("MediaService", () => {
  const service = new MediaService();

  afterEach(() => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID;
    delete process.env.CLOUDFLARE_STREAM_SIGNING_PRIVATE_KEY;
    delete process.env.CLOUDFLARE_R2_PUBLIC_URL;
  });

  it("requires Cloudflare Stream credentials before creating playback", () => {
    expect(() => service.createStreamPlayback("video-1")).toThrow(ServiceUnavailableException);
  });

  it("creates a material download for public URLs when downloads are allowed", () => {
    expect(
      service.createMaterialDownload({
        id: "asset-1",
        type: "PDF",
        url: "https://cdn.example.com/aula.pdf",
        metadata: { downloadable: true }
      })
    ).toMatchObject({
      allowed: true,
      provider: "public-url",
      url: "https://cdn.example.com/aula.pdf"
    });
  });

  it("blocks material downloads when metadata disables them", () => {
    expect(
      service.createMaterialDownload({
        id: "asset-1",
        type: "TRANSCRIPT",
        url: "https://cdn.example.com/transcript.txt",
        metadata: { downloadable: false }
      })
    ).toMatchObject({
      allowed: false
    });
  });

  it("prepares Cloudflare R2 downloads through the configured public base URL", () => {
    process.env.CLOUDFLARE_R2_PUBLIC_URL = "https://assets.example.com";

    expect(
      service.createMaterialDownload({
        id: "asset-1",
        type: "SLIDE",
        url: "r2://foxtrot-assets/slides/aula.pdf",
        metadata: {}
      })
    ).toMatchObject({
      allowed: true,
      provider: "cloudflare-r2",
      url: "https://assets.example.com/slides/aula.pdf"
    });
  });
});
