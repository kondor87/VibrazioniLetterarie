import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-void">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Wrap children so MobileNav gets proper flex sizing */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
        {/* Footer (desktop) */}
        <footer className="hidden md:flex shrink-0 items-center justify-between px-6 h-9 border-t border-white/[0.05]"
          style={{ background: "rgba(29,24,17,0.4)" }}>
          <span className="font-ui text-[11px] uppercase tracking-[0.18em] text-text-muted/60">Vibrazioni Letterarie</span>
          <span className="font-ui text-[11px] text-text-muted/50">La tua biblioteca personale · {new Date().getFullYear()}</span>
        </footer>
        <MobileNav />
      </div>
    </div>
  );
}
