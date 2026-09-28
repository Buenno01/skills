import * as React from "react";
import { cn } from "@/lib/utils";
/** Big number + label. size="deck" scales for the 1920x1080 canvas. Use sparingly (max 3 or 4 per view). */
export function Stat({ value, label, size = "default", className }: { value: React.ReactNode; label: string; size?: "default" | "deck"; className?: string }) {
  const deck = size === "deck";
  return (
    <div className={cn("flex flex-col", deck ? "gap-3" : "gap-1", className)}>
      <div className={cn("font-semibold tracking-tight tabular-nums", deck ? "text-[112px] leading-none" : "text-4xl")}>{value}</div>
      <div className={cn("text-muted-foreground", deck ? "text-[26px]" : "text-sm")}>{label}</div>
    </div>
  );
}
/** Row of Stats with dividers. */
export function StatRow({ children, size = "default", className }: { children: React.ReactNode; size?: "default" | "deck"; className?: string }) {
  return <div className={cn("flex divide-x", size === "deck" ? "[&>*]:px-16 [&>*:first-child]:pl-0 divide-border" : "[&>*]:px-6 [&>*:first-child]:pl-0", className)}>{children}</div>;
}
