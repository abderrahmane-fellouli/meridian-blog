"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, PenSquare, Globe, Settings, Menu, X, ChevronRight } from "lucide-react";
import { ownerSignOut } from "@/lib/actions/auth";
import { initials } from "@/lib/format";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const links = [
  { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard size={16} /> },
  { label: "Posts", href: "/admin/posts", icon: <FileText size={16} /> },
  { label: "New Post", href: "/admin/posts/new", icon: <PenSquare size={16} /> },
];

function Brand({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      title={collapsed ? site.name : undefined}
      className="font-display font-semibold text-sm text-[#e8e2d6] hover:text-white transition-colors tracking-wide"
      style={{ fontFamily: "var(--font-display)" }}
    >
      {collapsed ? site.name.charAt(0) : site.name}
    </Link>
  );
}

function NavItems({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const isActive = (href: string) =>
    pathname === href || (href !== "/admin/posts/new" && pathname.startsWith(`${href}/`));

  const item = (href: string, label: string, icon: React.ReactNode) => (
    <Link
      key={href}
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={cn(
        "admin-link w-full",
        collapsed && "lg:justify-center lg:px-2",
        isActive(href) && "active"
      )}
    >
      <span className="admin-link-icon shrink-0">{icon}</span>
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  return (
    <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
      {links.map((l) => item(l.href, l.label, l.icon))}
      <div className="my-3 border-t border-[var(--admin-sb-border)]" />
      {item("/", "View site", <Globe size={16} />)}
      {item("/admin/settings", "Settings", <Settings size={16} />)}
    </nav>
  );
}

function SidebarFooter({
  collapsed,
  displayName,
  email,
}: {
  collapsed: boolean;
  displayName: string;
  email: string;
}) {
  return (
    <div className="px-2 pb-3 shrink-0 border-t border-[var(--admin-sb-border)] pt-3">
      <form action={ownerSignOut}>
        <button
          type="submit"
          className={cn(
            "admin-link w-full",
            collapsed && "lg:justify-center lg:px-2"
          )}
          title={collapsed ? "Sign out" : undefined}
        >
          <span className="size-6 rounded-full bg-[var(--accent)] text-white text-xs font-semibold flex items-center justify-center shrink-0">
            {initials(displayName)}
          </span>
          {!collapsed && (
            <span className="flex-1 text-left min-w-0">
              <span className="block text-xs font-medium text-[#e8e2d6] truncate">{displayName}</span>
              <span className="block text-xs text-[var(--admin-sb-tx2)] truncate">{email}</span>
            </span>
          )}
        </button>
      </form>
    </div>
  );
}

function SidebarContent({
  pathname,
  collapsed,
  onToggleCollapse,
  displayName,
  email,
}: {
  pathname: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  displayName: string;
  email: string;
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Logo row */}
      <div
        className={cn(
          "flex items-center h-14 border-b border-[var(--admin-sb-border)] shrink-0",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {!collapsed && <Brand collapsed={false} onNavigate={() => undefined} />}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md text-[var(--admin-sb-tx2)] hover:bg-[var(--admin-sb-hover)] hover:text-[var(--admin-sb-tx)] transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronRight size={14} className={cn("transition-transform", collapsed ? "" : "rotate-180")} />
        </button>
      </div>
      <NavItems pathname={pathname} collapsed={collapsed} onNavigate={() => undefined} />
      <SidebarFooter collapsed={collapsed} displayName={displayName} email={email} />
    </div>
  );
}

function Shell({ displayName, email }: { displayName: string; email: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile topbar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between h-14 px-4 bg-[var(--admin-sb-solid)] border-b border-[var(--admin-sb-border)]">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="font-display font-semibold text-sm text-[#e8e2d6] hover:text-white transition-colors"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {site.name}
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--admin-sb-tx2)]">Admin</span>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            className="p-2 rounded-md text-[var(--admin-sb-tx2)] hover:bg-[var(--admin-sb-hover)] transition-colors"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-[var(--admin-sb-solid)] transition-transform pt-14",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent
          pathname={pathname}
          collapsed={false}
          onToggleCollapse={() => undefined}
          displayName={displayName}
          email={email}
        />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col bg-[var(--admin-sb-solid)] border-r border-[var(--admin-sb-border)] shrink-0 sticky top-0 h-screen transition-all duration-200">
        <div className={cn("h-full", collapsed ? "w-[52px]" : "w-56")}>
          <SidebarContent
            pathname={pathname}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((v) => !v)}
            displayName={displayName}
            email={email}
          />
        </div>
      </aside>
    </>
  );
}

export function AdminSidebar({ displayName, email }: { displayName: string; email: string }) {
  return <Shell displayName={displayName} email={email} />;
}