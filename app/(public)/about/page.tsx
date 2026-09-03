import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/services/settings";
import { StaticPage } from "@/components/site/static-page";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: "About",
    description: `About ${settings.authorName} and ${settings.siteName} — ${settings.description}`,
    alternates: { canonical: "/about" },
  };
}

export default async function AboutPage() {
  const settings = await getSettings();
  const initials =
    settings.authorName
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "M";

  return (
    <StaticPage
      eyebrow="About"
      title="About this site"
      intro={`${settings.siteName} is written by ${settings.authorName}, ${settings.authorRole}.`}
    >
      <div className="flex items-center gap-4">
        <div className="size-14 rounded-full bg-[var(--accent)] text-white text-lg font-semibold flex items-center justify-center shrink-0">
          {initials}
        </div>
        <div>
          <p className="font-display text-lg font-semibold text-[var(--tx-1)]" style={{ fontFamily: "var(--font-display)" }}>
            {settings.authorName}
          </p>
          <p className="text-sm text-[var(--tx-3)]">{settings.authorRole}</p>
        </div>
      </div>

      <p>{settings.authorBio}</p>

      <h2 className="text-xl font-semibold text-[var(--tx-1)] font-display pt-4" style={{ fontFamily: "var(--font-display)" }}>
        What you&rsquo;ll find here
      </h2>
      <p>
        {settings.siteName} publishes long-form writing on TypeScript, distributed systems, databases, and the
        engineering decisions that hold up over time — the kind of detail that&rsquo;s hard to search for and easy to get
        wrong. Every article is written from hands-on experience, with real code and honest caveats, not copied
        documentation.
      </p>

      <h2 className="text-xl font-semibold text-[var(--tx-1)] font-display pt-4" style={{ fontFamily: "var(--font-display)" }}>
        Get in touch
      </h2>
      <p>
        Feedback, corrections, and questions are always welcome. If you spot an error in an article or want to discuss
        a topic in more depth, reach out via the{" "}
        <Link href="/contact" className="text-[var(--accent)] hover:text-[var(--accent-h)] underline underline-offset-2">
          contact page
        </Link>
        .
      </p>
    </StaticPage>
  );
}
