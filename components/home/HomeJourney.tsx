"use client";

import { useId, useState } from "react";

type Step = { title: string; text: string };

export function HomeJourney({ title, steps }: { title: string; steps: Step[] }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const point = (angle: number, radius: number) => {
    const radians = angle * Math.PI / 180;
    return [200 + radius * Math.sin(radians), 200 - radius * Math.cos(radians)];
  };
  return (
    <div className="home-journey">
      <div className="home-journey__orbit">
        <h2 id={`${id}-title`}>{title}</h2>
        <svg viewBox="0 0 400 400" aria-hidden="true" className="home-journey__lines">
          <defs><marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M2 1 8 5 2 9" /></marker></defs>
          <circle cx="200" cy="200" r="136" className="home-journey__track" />
          {steps.map((step, index) => {
            const start = point(index * 360 / steps.length + 25, 136);
            const end = point((index + 1) * 360 / steps.length - 25, 136);
            return <path key={step.title} d={`M${start.join(" ")} A136 136 0 0 1 ${end.join(" ")}`} markerEnd={`url(#${id}-arrow)`} />;
          })}
        </svg>
        <ol aria-labelledby={`${id}-title`}>
          {steps.map((step, index) => {
            const angle = index * 2 * Math.PI / steps.length;
            return <li key={step.title} style={{ left: `${50 + 34 * Math.sin(angle)}%`, top: `${50 - 34 * Math.cos(angle)}%` }}>
              <button type="button" aria-pressed={active === index} onClick={() => setActive(index)}>
                <span className="home-journey__number" aria-hidden="true">{index + 1}</span>
                <span>{step.title}</span>
              </button>
            </li>;
          })}
        </ol>
      </div>
    </div>
  );
}
