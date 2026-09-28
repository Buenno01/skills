import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";
function Slider({ className, defaultValue, value, min = 0, max = 100, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const values = React.useMemo(() => Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min], [value, defaultValue, min]);
  return (
    <SliderPrimitive.Root defaultValue={defaultValue} value={value} min={min} max={max} className={cn("relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50", className)} {...props}>
      <SliderPrimitive.Track className="bg-muted relative grow overflow-hidden rounded-full h-1.5 w-full">
        <SliderPrimitive.Range className="bg-primary absolute h-full" />
      </SliderPrimitive.Track>
      {Array.from({ length: values.length }, (_, i) => (
        <SliderPrimitive.Thumb key={i} className="border-primary bg-background ring-ring/50 block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none cursor-grab" />
      ))}
    </SliderPrimitive.Root>
  );
}
export { Slider };
