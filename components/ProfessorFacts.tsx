"use client";

import { useId, useState } from "react";

type Fact = { label: string; value: string; text: string };

export function ProfessorFacts({ title, facts }: { title: string; facts: Fact[] }) {
  const [active, setActive] = useState(0);
  const id = useId();
  return <section className="professor-orbit" aria-labelledby={`${id}-title`}>
    <div className="professor-orbit__system">
      <h2 id={`${id}-title`}>{title}</h2>
      <svg viewBox="0 0 400 400" aria-hidden="true">
        <defs><marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M2 1 8 5 2 9" /></marker></defs>
        <circle cx="200" cy="200" r="132" />
        {[0, 120, 240].map(angle => <path key={angle} transform={`rotate(${angle} 200 200)`} d="M266 86 A132 132 0 0 1 332 200" markerEnd={`url(#${id}-arrow)`} />)}
      </svg>
      <ul>{facts.map((fact, index) => {
        const angle = index * 2 * Math.PI / facts.length;
        return <li key={fact.label} style={{ left: `${50 + 33 * Math.sin(angle)}%`, top: `${50 - 33 * Math.cos(angle)}%` }}>
          <button type="button" aria-pressed={index === active} aria-controls={`${id}-detail`} onClick={() => setActive(index)}>
            <span>{fact.label}</span><strong>{fact.value}</strong>
          </button>
        </li>;
      })}</ul>
    </div>
    <p className="professor-orbit__detail" id={`${id}-detail`} aria-live="polite">{facts[active].text}</p>
  </section>;
}
