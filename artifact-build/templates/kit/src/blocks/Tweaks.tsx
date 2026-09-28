import * as React from "react";
import { Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Switch } from "@/ui/switch";
import { Label } from "@/ui/label";

/** Optional floating panel with a dark-mode switch. Only include when the user asked for tweakability. */
export function Tweaks() {
  const [dark, setDark] = React.useState(() => localStorage.getItem("tweaks:dark") === "1");
  React.useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem("tweaks:dark", dark ? "1" : "0"); }, [dark]);
  return (
    <div className="no-print fixed bottom-4 left-4 z-40">
      <Popover>
        <PopoverTrigger className="rounded-full border bg-background p-2 shadow-sm hover:bg-accent cursor-pointer" aria-label="Tweaks"><Settings2 className="size-4" /></PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-56 space-y-3">
          <div className="flex items-center justify-between"><Label htmlFor="tw-dark">Modo escuro</Label><Switch id="tw-dark" checked={dark} onCheckedChange={setDark} /></div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
