import { DeckShell, Slide, SlideText as T } from "@/shells";
import { StatRow, Stat } from "@/blocks";
import { deck } from "./data";

export default function App() {
  return (
    <DeckShell title={deck.title}>
      <Slide layout="title" dark>
        <T.Kicker>{deck.kicker}</T.Kicker>
        <T.Title>{deck.title}</T.Title>
        <T.Sub>{deck.subtitle}</T.Sub>
      </Slide>
      {deck.slides.map((s, i) => (
        <Slide key={i}>
          <T.Heading>{s.heading}</T.Heading>
          <T.Body><ul>{s.points.map((p, j) => <li key={j}>{p}</li>)}</ul></T.Body>
        </Slide>
      ))}
      <Slide layout="content">
        <T.Heading>Em números</T.Heading>
        <StatRow size="deck" className="mt-auto mb-16">
          {deck.stats.map((s, i) => <Stat key={i} size="deck" value={s.value} label={s.label} />)}
        </StatRow>
      </Slide>
      <Slide layout="statement" dark>
        <T.Statement>{deck.closing}</T.Statement>
      </Slide>
    </DeckShell>
  );
}
