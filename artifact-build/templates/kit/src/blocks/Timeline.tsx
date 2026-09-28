import * as React from "react";
import { cn } from "@/lib/utils";

export type TimelineItem = { when: string; title: string; description?: React.ReactNode; status?: "done" | "current" | "todo" };
/** Vertical timeline. Status controls the dot: done (filled), current (ring), todo (hollow). */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol data-block className={cn("relative border-l ml-2 space-y-6 list-none pl-0", className)}>
      {items.map((it, i) => (
        <li key={i} className="pl-6 relative">
          <span className={cn("absolute -left-[5px] top-1.5 size-2.5 rounded-full border bg-background",
            it.status === "done" && "bg-primary border-primary",
            it.status === "current" && "border-primary ring-4 ring-primary/20")} />
          <div className="text-xs text-muted-foreground tabular-nums">{it.when}</div>
          <div className="font-medium">{it.title}</div>
          {it.description && <div className="text-sm text-muted-foreground mt-0.5">{it.description}</div>}
        </li>
      ))}
    </ol>
  );
}
