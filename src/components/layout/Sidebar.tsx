"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Library, LayoutDashboard,
  Quote,
  User, BookText, Upload, ChevronRight, History, Dna, LogOut, Compass, Gift, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// Navigazione raggruppata in 3 sezioni
const navGroups: { label: string; items: { href: string; label: string; icon: typeof Library }[] }[] = [
  {
    label: "Libreria",
    items: [
      { href: "/libri", label: "La libreria", icon: Library },
    ],
  },
  {
    label: "Analisi",
    items: [
      { href: "/dashboard", label: "Dashboard",         icon: LayoutDashboard },
      { href: "/timeline",  label: "La mia storia",     icon: History },
      { href: "/identita",  label: "Chi sono",          icon: Dna },
      { href: "/wrapped",   label: "Vibrazioni Annuali", icon: Gift },
    ],
  },
  {
    label: "Scoperta",
    items: [
      { href: "/scopri",    label: "Scopri",    icon: Compass },
      { href: "/comunita",  label: "Comunità",  icon: Users },
      { href: "/citazioni", label: "Frammenti", icon: Quote },
    ],
  },
];

const footerItems = [
  { href: "/importa", icon: Upload, label: "Importa libri" },
  { href: "/profilo", icon: User,   label: "Profilo" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const pathname = usePathname();
  const router   = useRouter();

  async function handleLogout() {
    const sb = createClient();
    await sb.auth.signOut();
    router.push("/login");
  }

  return (
    <aside
      className={cn(
        "hidden md:flex min-h-screen flex-col bg-surface-1 border-r border-white/[0.04] shrink-0 z-20",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "pt-5 pb-4 border-b border-white/[0.04] flex items-center overflow-hidden",
          collapsed ? "px-0 justify-center" : "px-5 gap-2"
        )}
      >
        <BookText size={18} className="text-gold shrink-0" />
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-display text-sm font-semibold text-gold tracking-[0.12em] uppercase whitespace-nowrap">
              Vibrazioni
            </div>
            <div className="font-display text-[11px] text-text-muted tracking-[0.2em] uppercase whitespace-nowrap">
              Letterarie
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto overflow-x-hidden">
        {navGroups.map((group, gi) => (
          <div key={group.label} className={cn(gi > 0 && "mt-4")}>
            {/* Group label / divider */}
            {collapsed ? (
              gi > 0 && <div className="mx-auto w-5 border-t border-white/[0.06] mb-2" />
            ) : (
              <p className="px-3 mb-1.5 font-ui text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center rounded-md overflow-hidden",
                      "font-ui text-[12px] font-medium uppercase tracking-[0.08em]",
                      "transition-all duration-200 group",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
                      collapsed ? "justify-center px-0 py-[9px]" : "px-3 py-[9px] gap-3",
                      isActive
                        ? "bg-gold/10 text-gold border-l-2 border-gold"
                        : "text-text-tert hover:text-text-sec hover:bg-surface-2 border-l-2 border-transparent"
                    )}
                  >
                    <Icon
                      size={16}
                      className={cn(
                        "shrink-0 transition-colors",
                        isActive ? "text-gold" : "text-text-muted group-hover:text-text-sec"
                      )}
                    />
                    {!collapsed && <span className="whitespace-nowrap">{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-white/[0.04] space-y-0.5 overflow-hidden">
        {footerItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={cn(
              "flex items-center rounded-md font-ui text-[12px] font-medium uppercase tracking-[0.08em]",
              "text-text-muted hover:text-text-sec hover:bg-surface-2 transition-all border-l-2 border-transparent",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
              collapsed ? "justify-center px-0 py-[9px]" : "px-3 py-[9px] gap-3"
            )}
          >
            <Icon size={16} className="shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">{label}</span>}
          </Link>
        ))}

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={collapsed ? "Esci" : undefined}
          className={cn(
            "flex items-center w-full rounded-md font-ui text-[12px] font-medium uppercase tracking-[0.08em]",
            "text-text-tert hover:text-red-400 hover:bg-red-400/5 transition-all border-l-2 border-transparent",
            collapsed ? "justify-center px-0 py-[9px]" : "px-3 py-[9px] gap-3"
          )}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Esci</span>}
        </button>

        {/* Toggle expand/collapse */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Espandi menu" : "Comprimi menu"}
          className={cn(
            "flex items-center w-full py-2 text-text-muted hover:text-gold/60",
            "transition-colors rounded-md hover:bg-surface-2",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
            collapsed ? "justify-center px-0" : "px-3 gap-2"
          )}
        >
          <ChevronRight
            size={13}
            className={cn("transition-transform duration-300", !collapsed && "rotate-180")}
          />
          {!collapsed && (
            <span className="font-ui text-[11px] uppercase tracking-wider">Comprimi</span>
          )}
        </button>
      </div>
    </aside>
  );
}
