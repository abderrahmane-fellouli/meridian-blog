import { createHash, createHmac } from "node:crypto";

/**
 * Minimal AWS SigV4 request signing + S3-compatible object storage client.
 *
 * Deliberately dependency-free (Node `crypto` only) so it works with any
 * S3-compatible endpoint: AWS S3, Cloudflare R2, MinIO, Wasabi, Backblaze B2,
 * DigitalOcean Spaces, etc. The bucket must be configured for public read so
 * that `urlPath` (an https URL) can be rendered directly in `<img>` tags.
 */

export interface S3ClientConfig {
  endpoint: string; // e.g. "https://<accountid>.r2.cloudflarestorage.com"
  region: string; // "auto" for R2, "us-east-1" for AWS, ...
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export interface S3PutOptions {
  contentType: string;
  cacheControl?: string;
}

function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function signingKey(secret: string, date: string, region: string, service: string): Buffer {
  const kDate = hmac(Buffer.from("AWS4" + secret, "utf8"), date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function getHmacSignature(key: Buffer, stringToSign: string): string {
  return createHmac("sha256", key).update(stringToSign, "utf8").digest("hex");
}

/** Resolve the S3 API endpoint host for a given config + key. */
function endpointFor(config: S3ClientConfig, key: string): URL {
  return new URL(`${config.endpoint.replace(/\/+$/, "")}/${encodeKey(key)}`);
}

/** URL-encode an S3 object key for path-style addressing. */
function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

export class S3Client {
  constructor(private readonly config: S3ClientConfig) {}

  async putObject(key: string, body: Buffer, opts: S3PutOptions): Promise<void> {
    const url = endpointFor(this.config, key);
    const headers = this.signedHeaders("PUT", url, body, {
      "content-type": opts.contentType,
      ...(opts.cacheControl ? { "cache-control": opts.cacheControl } : {}),
    });

    const res = await fetch(url, { method: "PUT", headers, body: new Uint8Array(body) });
    if (!res.ok) {
      throw new Error(`S3 put failed (${key}): ${res.status} ${await res.text()}`);
    }
  }

  async deleteObject(key: string): Promise<void> {
    const url = endpointFor(this.config, key);
    const headers = this.signedHeaders("DELETE", url, undefined, {});

    const res = await fetch(url, { method: "DELETE", headers });
    if (!res.ok && res.status !== 204 && res.status !== 404) {
      throw new Error(`S3 delete failed (${key}): ${res.status} ${await res.text()}`);
    }
  }

  private signedHeaders(
    method: string,
    url: URL,
    body: Buffer | undefined,
    extra: Record<string, string>
  ): Record<string, string> {
    const { region, accessKeyId, secretAccessKey } = this.config;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const host = url.host;

    const headers: Record<string, string> = {
      host,
      "x-amz-content-sha256": sha256(body ?? Buffer.alloc(0)),
      "x-amz-date": amzDate,
      ...extra,
    };

    const signedHeadersList = Object.keys(headers)
      .map((k) => k.toLowerCase())
      .sort();
    const canonicalHeaders = signedHeadersList
      .map((k) => `${k}:${headers[Object.keys(headers).find((x) => x.toLowerCase() === k)!].trim()}\n`)
      .join("");
    const signedHeadersString = signedHeadersList.join(";");

    const canonicalRequest = [
      method,
      url.pathname,
      url.search.replace(/^\?/, ""),
      canonicalHeaders,
      "",
      signedHeadersString,
      headers["x-amz-content-sha256"],
    ].join("\n");

    const scope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      scope,
      sha256(canonicalRequest),
    ].join("\n");

    const signature = getHmacSignature(signingKey(secretAccessKey, dateStamp, region, "s3"), stringToSign);

    const authHeader =
      `AWS4-HMAC-SHA256 ` +
      `Credential=${accessKeyId}/${scope}, ` +
      `SignedHeaders=${signedHeadersString}, ` +
      `Signature=${signature}`;

    // fetch sets Host itself; drop our local host entry.
    const out: Record<string, string> = { authorization: authHeader };
    for (const k of signedHeadersList) {
      if (k !== "host") out[k] = headers[Object.keys(headers).find((x) => x.toLowerCase() === k)!];
    }
    return out;
  }
}
