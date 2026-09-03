import { afterEach, describe, expect, it, vi } from "vitest";
import { S3Client, type S3ClientConfig } from "@/lib/services/s3-storage";
import { S3MediaStorage, s3ConfigFromEnv, type S3Config } from "@/lib/services/media";

const OLD_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...OLD_ENV };
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function makeConfig(): S3ClientConfig {
  return {
    endpoint: "https://abc123.r2.cloudflarestorage.com",
    region: "auto",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    bucket: "meridian-media",
  };
}

describe("S3Client signing", () => {
  it("sends a valid AWS4-HMAC-SHA256 signed PUT", async () => {
    const client = new S3Client(makeConfig());
    let captured: { url: string; init?: RequestInit } | undefined;

    const fetchStub = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      captured = { url: String(url), init };
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal("fetch", fetchStub);

    await client.putObject("uploads/2026/09/file.png", Buffer.from("hello"), {
      contentType: "image/png",
    });

    expect(captured).toBeDefined();
    const auth = (captured!.init!.headers as Record<string, string>).authorization;
    expect(auth).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE\/\d{8}\/(auto|us-east-1)\/s3\/aws4_request, SignedHeaders=[a-z0-9;-]+, Signature=[0-9a-f]{64}$/
    );
    expect(auth!).toContain("SignedHeaders=");
    expect(String(captured!.url)).toContain("/uploads/2026/09/file.png");
  });

  it("signs DELETE with a permissive status", async () => {
    const client = new S3Client(makeConfig());
    let captured: { init?: RequestInit } | undefined;
    const fetchStub = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      captured = { init };
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", fetchStub);

    await client.deleteObject("uploads/2026/09/file.png");
    expect(captured!.init!.method).toBe("DELETE");
  });
});

describe("S3MediaStorage", () => {
  it("selects the S3 backend from env and builds public paths", async () => {
    process.env.S3_BUCKET = "meridian-media";
    process.env.S3_ENDPOINT = "https://abc123.r2.cloudflarestorage.com";
    process.env.S3_REGION = "auto";
    process.env.S3_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE";
    process.env.S3_SECRET_ACCESS_KEY = "x";
    process.env.S3_PUBLIC_BASE_URL = "https://media.meridian.example";
    process.env.S3_PREFIX = "uploads";

    const cfg: S3Config = s3ConfigFromEnv()!;
    expect(cfg.bucket).toBe("meridian-media");
    expect(cfg.publicBaseUrl).toBe("https://media.meridian.example");

    const storage = new S3MediaStorage({ client: cfg.client, bucket: cfg.bucket, prefix: cfg.prefix, publicBaseUrl: cfg.publicBaseUrl });
    const put = vi.fn(async () => {});
    (storage as unknown as { client: { putObject: typeof put } }).client.putObject = put;

    const res = await storage.save({ data: Buffer.from("x"), mimeType: "image/png", ext: "png" });
    expect(put).toHaveBeenCalledTimes(1);
    const [key] = put.mock.calls[0] as unknown as [string];
    expect(key).toMatch(/^uploads\/\d{4}\/\d{2}\/[0-9a-f-]+\.png$/);
    expect(res.storagePath).toBe(key);
    expect(res.urlPath).toBe(`https://media.meridian.example/${encodeURIComponent(key).replace(/%2F/g, "/")}`);
  });
});
