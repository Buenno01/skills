import * as React from "react";
import { cn } from "@/lib/utils";

/** BoardShell: wide canvas with horizontal scroll for kanban / timeline / matrix. Header + optional legend. */
export function BoardShell({ title, subtitle, legend, children, className }: { title: string; subtitle?: string; legend?: React.ReactNode; children: React.ReactNode; className?: string }) {
  React.useEffect(() => { document.title = title; }, [title]);
  return (
    <div className={cn("min-h-screen bg-background flex flex-col", className)}>
      <header className="border-b px-6 py-4 flex items-end justify-between gap-6">
        <div><h1 className="text-xl font-semibold tracking-tight">{title}</h1>{subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}</div>
        {legend && <div className="flex items-center gap-4 text-sm text-muted-foreground">{legend}</div>}
      </header>
      <main className="flex-1 overflow-x-auto p-6 print:overflow-visible">{children}</main>
    </div>
  );
}
/** Kanban column. */
export function Column({ title, count, children, className }: { title: string; count?: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-[300px] shrink-0 flex flex-col gap-2 print:w-auto print:flex-1 print:min-w-0", className)}>
      <div className="flex items-center justify-between px-1 text-sm font-medium"><span>{title}</span>{count !== undefined && <span className="text-muted-foreground tabular-nums">{count}</span>}</div>
      <div className="rounded-lg bg-muted/60 p-2 flex flex-col gap-2 min-h-24">{children}</div>
    </div>
  );
}
