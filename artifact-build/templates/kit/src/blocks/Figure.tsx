import * as React from "react";
import { cn } from "@/lib/utils";
/** Framed content with caption (images, charts, code). Images must be data: URLs or bundled imports to stay self-contained. */
export function Figure({ caption, children, className }: { caption?: string; children: React.ReactNode; className?: string }) {
  return (
    <figure className={cn("my-4", className)}>
      <div className="rounded-lg border bg-card p-3 overflow-hidden">{children}</div>
      {caption && <figcaption className="mt-2 text-xs text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}
/** Placeholder for an image that is not available yet. */
export function ImagePlaceholder({ label = "Imagem", ratio = "16/9", className }: { label?: string; ratio?: string; className?: string }) {
  return <div className={cn("w-full grid place-items-center rounded-md bg-muted text-muted-foreground text-sm border border-dashed", className)} style={{ aspectRatio: ratio }}>{label}</div>;
}
