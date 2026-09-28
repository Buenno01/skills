import * as React from "react";
import { cn } from "@/lib/utils";

/** DashboardShell: compact header with title + optional right-side controls, then a 12-col grid body. Monitor surface: dense, glanceable. */
export function DashboardShell({ title, subtitle, controls, children, className }: { title: string; subtitle?: string; controls?: React.ReactNode; children: React.ReactNode; className?: string }) {
  React.useEffect(() => { document.title = title; }, [title]);
  return (
    <div className={cn("min-h-screen bg-muted/40", className)}>
      <header className="bg-background border-b">
        <div className="mx-auto max-w-[1400px] px-6 py-4 flex items-center justify-between gap-6">
          <div><h1 className="text-xl font-semibold tracking-tight">{title}</h1>{subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}</div>
          {controls && <div className="flex items-center gap-2">{controls}</div>}
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-6 py-6 grid grid-cols-12 gap-4 auto-rows-min">{children}</main>
    </div>
  );
}
/** Grid cell helper: span 1..12 columns. */
export function Cell({ span = 12, className, ...p }: React.ComponentProps<"div"> & { span?: number }) {
  return <div className={cn("min-w-0", className)} style={{ gridColumn: `span ${span} / span ${span}` }} {...p} />;
}
