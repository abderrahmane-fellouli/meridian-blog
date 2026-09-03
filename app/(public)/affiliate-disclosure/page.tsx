import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/services/settings";
import { StaticPage } from "@/components/site/static-page";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description: "Meridian's disclosure about affiliate links in articles.",
  alternates: { canonical: "/affiliate-disclosure" },
};

export default async function AffiliateDisclosurePage() {
  const settings = await getSettings();
  return (
    <StaticPage
      eyebrow="Disclosure"
      title="Affiliate Disclosure"
      intro="Transparency about links and compensation on Meridian."
    >
      <h2 className="text-xl font-semibold text-[var(--tx-1)] font-display pt-2" style={{ fontFamily: "var(--font-display)" }}>
        How it works
      </h2>
      <p>
        Some articles on {settings.siteName} may contain affiliate links. An affiliate link is a link that can earn a
        small commission for the site when you make a purchase through it — at no extra cost to you. This is a common
        way for independent publications to help cover hosting and running costs.
      </p>

      <h2 className="text-xl font-semibold text-[var(--tx-1)] font-display pt-4" style={{ fontFamily: "var(--font-display)" }}>
        When it appears
      </h2>
      <p>
        Any article that contains an affiliate link is clearly identified with a disclosure banner at the end of the
        article, in line with good practice and applicable consumer-protection rules. Articles without such a banner
        contain no affiliate links.
      </p>

      <h2 className="text-xl font-semibold text-[var(--tx-1)] font-display pt-4" style={{ fontFamily: "var(--font-display)" }}>
        Editorial independence
      </h2>
      <p>
        Affiliate relationships never determine what is written or whether a product is recommended. Products and
        tools are covered on their merits, and links to a recommended option do not change the accuracy or honesty of
        the surrounding advice. If a product is mentioned because of an affiliate relationship, that is disclosed.
      </p>

      <h2 className="text-xl font-semibold text-[var(--tx-1)] font-display pt-4" style={{ fontFamily: "var(--font-display)" }}>
        Questions
      </h2>
      <p>
        If you have any questions about this disclosure, please get in touch via the{" "}
        <Link href="/contact" className="text-[var(--accent)] hover:text-[var(--accent-h)] underline underline-offset-2">
          contact page
        </Link>
        .
      </p>
    </StaticPage>
  );
}
