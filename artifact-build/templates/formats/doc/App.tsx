import { DocShell, DocSection } from "@/shells";
import { Callout, DataTable } from "@/blocks";
import { doc } from "./data";

export default function App() {
  return (
    <DocShell title={doc.title} subtitle={doc.subtitle} meta={<><span>{doc.author}</span><span>{doc.date}</span></>}>
      <DocSection id="resumo" title="Resumo">
        <p>{doc.summary}</p>
        <Callout kind="info" title="Decisão pedida">{doc.ask}</Callout>
      </DocSection>
      {doc.sections.map(s => (
        <DocSection key={s.id} id={s.id} title={s.title}>
          {s.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </DocSection>
      ))}
      <DocSection id="dados" title="Dados">
        <DataTable rows={doc.table.rows} columns={doc.table.columns} />
      </DocSection>
    </DocShell>
  );
}
