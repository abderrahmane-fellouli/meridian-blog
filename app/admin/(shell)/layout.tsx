import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireOwnerReady } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const owner = await requireOwnerReady();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--tx-1)] flex">
      <AdminSidebar displayName={owner.name ?? "Owner"} email={owner.email} />
      <div className="flex-1 min-w-0 flex flex-col pt-14 lg:pt-0">
        <main className="flex-1 w-full min-h-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}