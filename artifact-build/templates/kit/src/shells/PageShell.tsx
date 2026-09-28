import * as React from "react";
import { cn } from "@/lib/utils";

/** PageShell: single A4 (or Letter) page for print-first one-pagers. Content is clipped to the page; keep it short. */
export function PageShell({ title, size = "A4", children, className }: { title: string; size?: "A4" | "Letter"; children: React.ReactNode; className?: string }) {
  React.useEffect(() => { document.title = title; }, [title]);
  const dims = size === "A4" ? { w: "210mm", h: "297mm" } : { w: "216mm", h: "279mm" };
  return (
    <div className="min-h-screen bg-muted/50 py-8 print:py-0 print:bg-white">
      <article className={cn("page mx-auto bg-background text-foreground shadow-md print:shadow-none overflow-hidden p-[18mm] flex flex-col gap-5 text-[11pt] leading-relaxed", className)} style={{ width: dims.w, height: dims.h }}>{children}</article>
      <style>{`@page { size: ${size}; margin: 0; } @media print { .page { width: ${dims.w}; height: ${dims.h}; } }`}</style>
    </div>
  );
}
