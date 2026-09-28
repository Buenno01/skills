import * as React from "react";
import { Info, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const map = {
  info: { icon: Info, cls: "border-border bg-muted/50" },
  warning: { icon: AlertTriangle, cls: "border-warning/50 bg-warning/10" },
  success: { icon: CheckCircle2, cls: "border-success/40 bg-success/10" },
  danger: { icon: XCircle, cls: "border-destructive/40 bg-destructive/10" },
};
/** Inline note box. No left accent rail: a full thin border and subtle tint instead. */
export function Callout({ kind = "info", title, children, className }: { kind?: keyof typeof map; title?: string; children: React.ReactNode; className?: string }) {
  const { icon: Icon, cls } = map[kind];
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm flex gap-3", cls, className)}>
      <Icon className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 [&_p]:my-0">{title && <div className="font-medium mb-0.5">{title}</div>}{children}</div>
    </div>
  );
}
