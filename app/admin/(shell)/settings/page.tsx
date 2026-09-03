import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireOwnerReady } from "@/lib/auth-server";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function AdminSettingsPage() {
  await requireOwnerReady();
  const settings = await getSettings();
  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto w-full">
      <PageHeader title="Settings" description="Site identity, author info, and SEO defaults." />
      <SettingsForm initial={settings} />
    </div>
  );
}