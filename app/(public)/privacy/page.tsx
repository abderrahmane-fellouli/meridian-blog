import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/services/settings";
import { StaticPage } from "@/components/site/static-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Meridian handles data and privacy.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const settings = await getSettings();
  return (
    <StaticPage
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="Last updated: September 2026. This page explains what information Meridian collects and how it is used."
    >
      <h2 className="text-xl font-semibold text-[var(--tx-1)] font-display pt-2" style={{ fontFamily: "var(--font-display)" }}>
        The short version
      </h2>
      <p>
        {settings.siteName} is a personal blog. The public site has no tracking, no advertising networks, and no
        analytics scripts. It does not require an account to read, search, or follow via the RSS feed.
      </p>

      <h2 className="text-xl font-semibold text-[var(--tx-1)] font-display pt-4" style={{ fontFamily: "var(--font-display)" }}>
        Data we collect
      </h2>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong className="text-[var(--tx-1)]">Theme preference.</strong> A small cookie stores your light/dark
          preference so the site renders consistently on the next visit. It never leaves your browser.
        </li>
        <li>
          <strong className="text-[var(--tx-1)]">Server logs.</strong> Like any web server, standard request logs
          (IP address, user agent, requested page) may be retained briefly by the hosting provider for security and
          reliability. These are not used for profiling.
        </li>
        <li>
          <strong className="text-[var(--tx-1)]">Contact messages.</strong> If you email the site, that correspondence
          is stored in the mail account used to receive it and is used only to reply.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-[var(--tx-1)] font-display pt-4" style={{ fontFamily: "var(--font-display)" }}>
        The private admin area
      </h2>
      <p>
        {settings.siteName}&rsquo;s content management is behind a login protected by a username and password, and is
        intended for the site owner only. It stores no visitor data.
      </p>

      <h2 className="text-xl font-semibold text-[var(--tx-1)] font-display pt-4" style={{ fontFamily: "var(--font-display)" }}>
        Cookies
      </h2>
      <p>
        The public site uses a single first-party cookie for the appearance (theme) preference. No third-party cookies
        are set.{" "}
        <Link href="/contact" className="text-[var(--accent)] hover:text-[var(--accent-h)] underline underline-offset-2">
          Contact us
        </Link>{" "}
        with any questions about this policy.
      </p>

      <h2 className="text-xl font-semibold text-[var(--tx-1)] font-display pt-4" style={{ fontFamily: "var(--font-display)" }}>
        Changes
      </h2>
      <p>
        If this policy changes in a material way, the &ldquo;Last updated&rdquo; date above will be revised. Continued
        use of the site after a change constitutes acceptance of the updated policy.
      </p>
    </StaticPage>
  );
}
