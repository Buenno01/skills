import { BoardShell, Column } from "@/shells";
import { Card, CardContent } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { board } from "./data";

export default function App() {
  return (
    <BoardShell title={board.title} subtitle={board.subtitle}>
      <div className="flex gap-4">
        {board.columns.map(c => (
          <Column key={c.id} title={c.title} count={board.cards.filter(k => k.column === c.id).length}>
            {board.cards.filter(k => k.column === c.id).map(k => (
              <Card key={k.id} className="py-3 gap-1 shadow-none"><CardContent className="px-3 space-y-1">
                <div className="text-sm font-medium">{k.title}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Badge variant="outline">{k.owner}</Badge><span>{k.due}</span></div>
              </CardContent></Card>
            ))}
          </Column>
        ))}
      </div>
    </BoardShell>
  );
}
