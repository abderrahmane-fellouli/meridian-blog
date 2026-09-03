import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { getSettings } from "@/lib/services/settings";
import { StaticPage } from "@/components/site/static-page";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to get in touch with Meridian.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSettings();
  const email = settings.contactEmail?.trim();

  return (
    <StaticPage
      eyebrow="Contact"
      title="Get in touch"
      intro="Questions, corrections, and ideas — I read everything and reply when I can."
    >
      {email ? (
        <>
          <p>
            The best way to reach me is by email. I&rsquo;m happy to talk about anything you&rsquo;ve read on{" "}
            {settings.siteName}, related topics you&rsquo;d like covered, or the occasional freelance and consulting
            opportunity.
          </p>
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-h)] transition-colors"
          >
            <Mail size={15} /> {email}
          </a>
        </>
      ) : (
        <p>
          Thanks for your interest. The site owner can be reached by email — the address is listed in the site
          settings. For urgent matters, reach out to {settings.authorName} directly.
        </p>
      )}

      <h2 className="text-xl font-semibold text-[var(--tx-1)] font-display pt-4" style={{ fontFamily: "var(--font-display)" }}>
        Before you write
      </h2>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong className="text-[var(--tx-1)]">Corrections:</strong> include the article title and the specific
          section you&rsquo;re referring to, so the fix can be verified and applied quickly.
        </li>
        <li>
          <strong className="text-[var(--tx-1)]">Guest posts:</strong> I don&rsquo;t currently accept guest articles or
          sponsored content.
        </li>
        <li>
          <strong className="text-[var(--tx-1)]">Spam and newsletters:</strong> unsolicited pitches are not replied to.
        </li>
      </ul>
    </StaticPage>
  );
}
