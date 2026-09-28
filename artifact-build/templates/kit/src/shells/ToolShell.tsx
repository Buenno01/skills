import * as React from "react";
import { cn } from "@/lib/utils";

/** ToolShell: inputs on the left (sticky), computed outputs on the right. Configure + Monitor surface for calculators and simulators. */
export function ToolShell({ title, description, inputs, children, className }: { title: string; description?: string; inputs: React.ReactNode; children: React.ReactNode; className?: string }) {
  React.useEffect(() => { document.title = title; }, [title]);
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-2 text-muted-foreground max-w-[64ch]">{description}</p>}
        <div className="mt-8 grid gap-8 lg:grid-cols-[340px_1fr] items-start">
          <aside className="lg:sticky lg:top-8 rounded-xl border bg-card p-5 space-y-5">{inputs}</aside>
          <section className="min-w-0 space-y-6">{children}</section>
        </div>
      </div>
    </div>
  );
}
/** Labeled input row for the inputs panel. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between"><span className="text-sm font-medium">{label}</span>{hint && <span className="text-xs text-muted-foreground tabular-nums">{hint}</span>}</div>
      {children}
    </div>
  );
}
