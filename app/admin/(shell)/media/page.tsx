import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { MediaLibrary } from "@/components/admin/media-library";
import { requireOwnerReady } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Media",
};

export default async function AdminMediaPage() {
  await requireOwnerReady();
  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto w-full">
      <PageHeader title="Media" description="Uploads and images for your posts." />
      <MediaLibrary />
    </div>
  );
}