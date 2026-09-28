import * as React from "react";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Input } from "@/ui/input";

export type Column<T> = { key: keyof T & string; header: string; align?: "left" | "right"; render?: (row: T) => React.ReactNode; sortable?: boolean; width?: string };

/** Sortable, filterable table. Pass rows + columns; numbers auto right-align when align is omitted. */
export function DataTable<T extends Record<string, any>>({ rows, columns, searchable, pageSize, className, caption }: { rows: T[]; columns: Column<T>[]; searchable?: boolean; pageSize?: number; className?: string; caption?: string }) {
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = React.useState(0);
  const filtered = React.useMemo(() => {
    let r = rows;
    if (q) { const s = q.toLowerCase(); r = r.filter(row => columns.some(c => String(row[c.key] ?? "").toLowerCase().includes(s))); }
    if (sort) r = [...r].sort((a, b) => { const x = a[sort.key], y = b[sort.key]; return (x > y ? 1 : x < y ? -1 : 0) * sort.dir; });
    return r;
  }, [rows, q, sort, columns]);
  const pages = pageSize ? Math.ceil(filtered.length / pageSize) : 1;
  const view = pageSize ? filtered.slice(page * pageSize, (page + 1) * pageSize) : filtered;
  return (
    <div className={cn("space-y-2", className)}>
      {searchable && <Input placeholder="Filtrar..." value={q} onChange={e => { setQ(e.target.value); setPage(0); }} className="max-w-xs h-8" />}
      <div className="rounded-lg border bg-card">
        <Table>
          {caption && <caption className="text-muted-foreground text-xs py-2">{caption}</caption>}
          <TableHeader><TableRow>
            {columns.map(c => {
              const isNum = c.align === "right" || (c.align === undefined && typeof rows[0]?.[c.key] === "number");
              return <TableHead key={c.key} style={{ width: c.width }} className={cn(isNum && "text-right", c.sortable !== false && "cursor-pointer select-none")} onClick={() => c.sortable !== false && setSort(s => ({ key: c.key, dir: s?.key === c.key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
                <span className="inline-flex items-center gap-1">{c.header}{c.sortable !== false && <ArrowUpDown className={cn("size-3", sort?.key === c.key ? "opacity-100" : "opacity-30")} />}</span>
              </TableHead>;
            })}
          </TableRow></TableHeader>
          <TableBody>
            {view.map((row, i) => <TableRow key={i}>{columns.map(c => {
              const isNum = c.align === "right" || (c.align === undefined && typeof row[c.key] === "number");
              return <TableCell key={c.key} className={cn(isNum && "text-right tabular-nums")}>{c.render ? c.render(row) : String(row[c.key] ?? "")}</TableCell>;
            })}</TableRow>)}
            {!view.length && <TableRow><TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">Nenhum resultado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      {pages > 1 && <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
        <button className="hover:text-foreground cursor-pointer disabled:opacity-40" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button>
        <span className="tabular-nums">{page + 1} / {pages}</span>
        <button className="hover:text-foreground cursor-pointer disabled:opacity-40" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Próxima</button>
      </div>}
    </div>
  );
}
