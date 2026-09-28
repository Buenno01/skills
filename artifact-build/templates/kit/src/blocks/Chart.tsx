import * as React from "react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";

const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
type Series = { key: string; label?: string; color?: string };
type Common = { data: Record<string, any>[]; x: string; series: Series[]; height?: number; className?: string; format?: (v: number) => string; legend?: boolean; stacked?: boolean };

const axis = { tick: { fontSize: 12, fill: "var(--muted-foreground)" }, axisLine: false, tickLine: false } as const;
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--foreground)" }, cursor: { fill: "var(--muted)" } };

/** Themed recharts wrappers. kind: line | bar | area | pie. Colors follow --chart-N tokens. */
export function Chart({ kind, data, x, series, height = 260, className, format, legend, stacked }: Common & { kind: "line" | "bar" | "area" }) {
  const fmt = format ?? ((v: number) => String(v));
  const common = { data, margin: { top: 8, right: 12, left: 4, bottom: 0 } };
  const parts = (
    <>
      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
      <XAxis dataKey={x} {...axis} />
      <YAxis {...axis} tickFormatter={fmt} width={56} tickMargin={4} />
      <Tooltip {...tip} formatter={(v: any) => fmt(Number(v))} />
      {legend && <Legend wrapperStyle={{ fontSize: 12 }} />}
    </>
  );
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === "line" ? (
          <LineChart {...common}>{parts}{series.map((s, i) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.label ?? s.key} stroke={s.color ?? colors[i % 5]} strokeWidth={2} dot={false} isAnimationActive={false} />)}</LineChart>
        ) : kind === "bar" ? (
          <BarChart {...common}>{parts}{series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.label ?? s.key} fill={s.color ?? colors[i % 5]} radius={[3, 3, 0, 0]} stackId={stacked ? "a" : undefined} isAnimationActive={false} />)}</BarChart>
        ) : (
          <AreaChart {...common}>{parts}{series.map((s, i) => <Area key={s.key} type="monotone" dataKey={s.key} name={s.label ?? s.key} stroke={s.color ?? colors[i % 5]} fill={s.color ?? colors[i % 5]} fillOpacity={0.12} strokeWidth={2} stackId={stacked ? "a" : undefined} isAnimationActive={false} />)}</AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({ data, nameKey, valueKey, height = 240, className, format }: { data: Record<string, any>[]; nameKey: string; valueKey: string; height?: number; className?: string; format?: (v: number) => string }) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius="55%" outerRadius="85%" paddingAngle={2} isAnimationActive={false} stroke="var(--background)">
            {data.map((_, i) => <Cell key={i} fill={colors[i % 5]} />)}
          </Pie>
          <Tooltip {...tip} formatter={(v: any) => (format ?? String)(Number(v))} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
