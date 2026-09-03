import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { publishDueScheduled } from "@/lib/services/scheduling";

/**
 * Scheduled-publishing endpoint. Promotes any post that is `scheduled` and due
 * (`publishedAt <= now`), then revalidates the aggregate public routes so the
 * newly published content is immediately crawlable.
 *
 * Runs on Vercel Cron at a 5-minute cadence, but the route itself is portable:
 * any external scheduler may hit it via GET or POST with the shared secret.
 */

function secretsEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const bearer = req.headers.get("authorization");
  if (bearer?.toLowerCase().startsWith("bearer ")) {
    const token = bearer.slice(7).trim();
    return token.length > 0 && secretsEqual(token, secret);
  }
  const querySecret = new URL(req.url).searchParams.get("secret");
  return !!querySecret && secretsEqual(querySecret, secret);
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured on the server." },
      { status: 503 }
    );
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const promoted = await publishDueScheduled();
    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath("/feed.xml");
    revalidatePath("/sitemap.xml");
    return NextResponse.json({
      ok: true,
      promoted,
      promotedCount: promoted.length,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Scheduled publishing failed." },
      { status: 500 }
    );
  }
}
