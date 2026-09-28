import * as React from "react";
import { BoardShell, Column } from "@/shells";
import { Card, CardContent } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/ui/table";
import { cn } from "@/lib/utils";
import { Check, X, AlertTriangle, Flag } from "lucide-react";
import { board, kanban, matrix, statusLabel, type Status } from "./data";

// ---------- shared status styling (tokens only) ----------
const barClass: Record<Status, string> = {
  doing: "bg-background border-2 border-foreground font-semibold",
  todo: "bg-background border border-dashed text-foreground",
  done: "bg-muted text-muted-foreground",
  risk: "bg-background border-2 border-destructive text-foreground",
};

// Greedy row packing: items that overlap in time go to the next row inside the lane.
function packRows<T extends { start: number; end: number }>(items: T[]) {
  const rows: number[] = [];
  const placed = items.map(it => {
    let r = 0;
    while (rows[r] !== undefined && rows[r] >= it.start) r++;
    rows[r] = it.end;
    return { ...it, row: r };
  });
  return { placed, rowCount: rows.length };
}

// ---------- Roadmap timeline: one CSS grid, bars placed with inline gridColumn/gridRow ----------
function Roadmap() {
  const cols = board.months.length * 2; // half-month resolution
  const lanes = board.lanes.map(l => ({ ...l, ...packRows(l.items) }));
  const headerRows = 2; // months + milestones
  let cursor = headerRows + 1;
  const laneStart = lanes.map(l => { const s = cursor; cursor += l.rowCount; return s; });
  const totalRows = cursor - 1;

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <div
        className="relative grid min-w-[1040px] print:min-w-0 gap-y-1"
        style={{ gridTemplateColumns: `200px repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `auto auto repeat(${totalRows - headerRows}, 40px)` }}
      >
        {/* vertical grid lines, one per half-month */}
        {Array.from({ length: cols }, (_, i) => (
          <div key={`g${i}`} className={cn("border-l", i % 2 === 0 ? "border-border" : "border-border/40")} style={{ gridColumn: i + 2, gridRow: `1 / ${totalRows + 1}` }} />
        ))}
        {/* month headers */}
        <div className="text-xs font-medium text-muted-foreground px-2 py-1" style={{ gridColumn: 1, gridRow: 1 }}>Frente</div>
        {board.months.map((m, i) => (
          <div key={m} className="text-sm font-medium px-2 py-1" style={{ gridColumn: `${i * 2 + 2} / span 2`, gridRow: 1 }}>{m}</div>
        ))}
        {/* milestones: label in row 2, dashed line through all lanes */}
        {board.milestones.map(ms => (
          <React.Fragment key={ms.label}>
            <div className="flex items-center gap-1 text-xs text-muted-foreground px-2 pb-1" style={{ gridColumn: ms.at + 1, gridRow: 2 }}>
              <Flag className="size-3" /> {ms.label}
            </div>
            <div className="border-l-2 border-dashed border-foreground/40 pointer-events-none" style={{ gridColumn: ms.at + 1, gridRow: `3 / ${totalRows + 1}` }} />
          </React.Fragment>
        ))}
        {/* lanes */}
        {lanes.map((lane, li) => (
          <React.Fragment key={lane.id}>
            <div className="border-t px-2 py-1 pr-4" style={{ gridColumn: 1, gridRow: `${laneStart[li]} / span ${lane.rowCount}` }}>
              <div className="text-sm font-medium leading-tight">{lane.title}</div>
              <div className="text-xs text-muted-foreground">{lane.owner}</div>
            </div>
            <div className="border-t" style={{ gridColumn: `2 / ${cols + 2}`, gridRow: laneStart[li] }} />
            {lane.placed.map(it => (
              <div
                key={it.id}
                className={cn("z-10 self-center mx-1 h-7 rounded-md px-2 flex items-center gap-1.5 text-xs font-medium truncate", barClass[it.status])}
                style={{ gridColumn: `${it.start + 1} / ${it.end + 2}`, gridRow: laneStart[li] + it.row }}
                title={`${it.title} (${statusLabel[it.status]})`}
              >
                {it.status === "done" && <Check className="size-3.5 shrink-0" />}
                {it.status === "risk" && <AlertTriangle className="size-3.5 shrink-0 text-destructive" />}
                <span className="truncate">{it.title}</span>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ---------- Kanban: Column + compact Cards ----------
function Kanban() {
  return (
    <div className="flex gap-4">
      {kanban.columns.map(c => {
        const cards = kanban.cards.filter(k => k.status === c.id);
        return (
          <Column key={c.id} title={c.title} count={cards.length} className="print:w-auto print:flex-1 print:min-w-0">
            {cards.map(k => (
              <Card key={k.id} className="py-2.5 gap-0 shadow-none print:break-inside-avoid">
                <CardContent className="px-3 space-y-1.5">
                  <div className="text-sm font-medium leading-snug">{k.title}</div>
                  {k.note && <div className="text-xs text-destructive leading-snug">{k.note}</div>}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <Badge variant="outline">{k.squad}</Badge>
                    <span className="tabular-nums">{k.due} · {k.points} pts</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </Column>
        );
      })}
    </div>
  );
}

// ---------- Comparison matrix: Table, icons, one highlighted column ----------
function Mark({ v }: { v: boolean | string }) {
  if (v === true) return <Check className="size-4 text-success mx-auto" aria-label="Sim" />;
  if (v === false) return <X className="size-4 text-muted-foreground/60 mx-auto" aria-label="Não" />;
  return <span className="text-sm">{v}</span>;
}
function Matrix() {
  const hl = (id: string) => (matrix.plans.find(p => p.id === id)?.recommended ? "bg-muted/60" : "");
  return (
    <div className="max-w-[900px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[320px]">Capacidade</TableHead>
            {matrix.plans.map(p => (
              <TableHead key={p.id} className={cn("text-center", hl(p.id))}>
                <div className="flex flex-col items-center gap-1 py-1">
                  <span className="font-semibold text-foreground">{p.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{p.price}</span>
                  {p.recommended && <Badge>Recomendado</Badge>}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {matrix.rows.map(r => (
            <TableRow key={r.feature}>
              <TableCell className="font-medium">{r.feature}</TableCell>
              {matrix.plans.map(p => (
                <TableCell key={p.id} className={cn("text-center", hl(p.id))}><Mark v={r[p.id]} /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-3 text-sm text-muted-foreground">{matrix.note}</p>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 print:break-inside-avoid-page">
      <div className="flex items-baseline gap-3 print:break-after-avoid">
        <h2 className="text-base font-semibold">{title}</h2>
        {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export default function App() {
  const legend = (
    <>
      {(Object.keys(statusLabel) as Status[]).map(s => (
        <span key={s} className="flex items-center gap-1.5 whitespace-nowrap">
          <span className={cn("inline-block h-3 w-6 rounded-sm", barClass[s])} />
          {statusLabel[s]}
        </span>
      ))}
    </>
  );
  return (
    <BoardShell title={board.title} subtitle={board.subtitle} legend={legend}>
      <style>{`@page { size: A4 landscape; margin: 12mm; }`}</style>
      <div className="space-y-10">
        <Section title="Linha do tempo" hint="resolução de quinzena; marcos em linha tracejada"><Roadmap /></Section>
        <Section title="Quadro por status" hint={`${kanban.cards.length} itens, ${kanban.cards.reduce((a, c) => a + c.points, 0)} pontos`}><Kanban /></Section>
        <Section title={matrix.title}><Matrix /></Section>
      </div>
    </BoardShell>
  );
}
