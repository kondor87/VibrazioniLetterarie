"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, History, Plus, LayoutDashboard, Dna } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddBookDialog } from "@/components/books/AddBookDialog";
import { useAddBook } from "@/lib/hooks/useBooks";
import { useAuth } from "@/lib/hooks/useAuth";
import type { NewBookData } from "@/components/books/AddBookDialog";

const NAV = [
  { href: "/libri",     label: "Libreria",  icon: Library },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/timeline",  label: "Storia",    icon: History },
  { href: "/identita",  label: "Chi sono",  icon: Dna },
] as const;

export function MobileNav() {
  const pathname    = usePathname();
  const { userId }  = useAuth();
  const addBook     = useAddBook();
  const [open, setOpen] = useState(false);

  async function handleAdd(data: NewBookData) {
    if (!userId) return;
    await addBook.mutateAsync({ data, userId });
    setOpen(false);
  }

  return (
    <>
      <nav
        className="md:hidden shrink-0 bg-surface-1/95 backdrop-blur-md border-t border-white/[0.05]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-[56px]">
          {/* Left 2 */}
          {NAV.slice(0, 2).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
                style={{ color: active ? "#d4a15e" : "#5a4535" }}>
                <Icon size={19} strokeWidth={active ? 2 : 1.5} />
                <span className="font-ui text-[11px] uppercase tracking-[0.1em]">{label}</span>
              </Link>
            );
          })}

          {/* Center FAB */}
          <div className="flex items-center justify-center flex-1 h-full">
            <button
              onClick={() => setOpen(true)}
              className="flex items-center justify-center w-11 h-11 rounded-full -mt-4 transition-all active:scale-90"
              style={{
                background: "rgba(212,161,94,0.12)",
                border: "1.5px solid rgba(212,161,94,0.35)",
                boxShadow: "0 0 16px rgba(212,161,94,0.15)",
              }}
            >
              <Plus size={21} className="text-gold" strokeWidth={2} />
            </button>
          </div>

          {/* Right 2 */}
          {NAV.slice(2).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
                style={{ color: active ? "#d4a15e" : "#5a4535" }}>
                <Icon size={19} strokeWidth={active ? 2 : 1.5} />
                <span className="font-ui text-[11px] uppercase tracking-[0.1em]">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <AddBookDialog open={open} onClose={() => setOpen(false)} onAdd={handleAdd} />
    </>
  );
}
