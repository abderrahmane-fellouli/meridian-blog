import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/services/settings";
import { StaticPage } from "@/components/site/static-page";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms and conditions for using Meridian.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const settings = await getSettings();
  return (
    <StaticPage
      eyebrow="Terms"
      title="Terms of Use"
      intro="Last updated: September 2026. By using this site you agree to the following terms."
    >
      <h2 className="text-xl font-semibold text-[var(--tx-1)] font-display pt-2" style={{ fontFamily: "var(--font-display)" }}>
        Content
      </h2>
      <p>
        All articles and other content on {settings.siteName} are provided for general information and educational
        purposes. While every effort is made to keep technical content accurate, it is provided &ldquo;as is&rdquo;
        without warranty of any kind, express or implied. You are responsible for verifying anything before relying on
        it.
      </p>

      <h2 className="text-xl font-semibold text-[var(--tx-1)] font-display pt-4" style={{ fontFamily: "var(--font-display)" }}>
        Copyright
      </h2>
      <p>
        Original writing and code examples on this site are copyright {settings.authorName} unless stated otherwise.
        Feel free to quote and link to articles with attribution. Republishing full articles without written permission
        is not permitted.
      </p>

      <h2 className="text-xl font-semibold text-[var(--tx-1)] font-display pt-4" style={{ fontFamily: "var(--font-display)" }}>
        Third-party links
      </h2>
      <p>
        Articles may link to external websites. These links are provided for convenience; {settings.siteName} is not
        responsible for the content or practices of any third-party site. See the{" "}
        <Link
          href="/affiliate-disclosure"
          className="text-[var(--accent)] hover:text-[var(--accent-h)] underline underline-offset-2"
        >
          affiliate disclosure
        </Link>{" "}
        for information about link relationships.
      </p>

      <h2 className="text-xl font-semibold text-[var(--tx-1)] font-display pt-4" style={{ fontFamily: "var(--font-display)" }}>
        Limitation of liability
      </h2>
      <p>
        To the fullest extent permitted by law, {settings.siteName} and its author shall not be liable for any
        damages arising from the use of, or inability to use, this site or the information it contains.
      </p>

      <h2 className="text-xl font-semibold text-[var(--tx-1)] font-display pt-4" style={{ fontFamily: "var(--font-display)" }}>
        Governing law
      </h2>
      <p>
        These terms are governed by the laws of the jurisdiction in which the site owner is based.{" "}
        <Link href="/contact" className="text-[var(--accent)] hover:text-[var(--accent-h)] underline underline-offset-2">
          Contact
        </Link>{" "}
        with any questions about these terms.
      </p>
    </StaticPage>
  );
}
