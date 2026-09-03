import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { getTheme } from "@/lib/theme-server";
import { getSettings } from "@/lib/services/settings";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [theme, settings] = await Promise.all([getTheme(), getSettings()]);

  return (
    <div className="min-h-full bg-[var(--bg)] flex flex-col">
      <Header theme={theme} siteName={settings.siteName} tagline={settings.tagline} />
      <main className="flex-1">{children}</main>
      <Footer
        siteName={settings.siteName}
        footerTagline={settings.footerTagline}
        authorName={settings.authorName}
        socialLinks={settings.socialLinks}
      />
    </div>
  );
}