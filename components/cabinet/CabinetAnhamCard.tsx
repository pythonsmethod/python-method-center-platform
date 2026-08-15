"use client";

import { openAnham } from "@/components/assistant/AnhamOpenButton";
import { IconAnkh } from "@/components/icons/EgyptianIcons";

type CabinetAnhamCardProps = {
  label: string;
  title: string;
  text: string;
  questions: string[];
  boundary: string;
  button: string;
};

export function CabinetAnhamCard({ label, title, text, questions, boundary, button }: CabinetAnhamCardProps) {
  return <section aria-labelledby="cabinet-anham-title" className="contact-card contact-card--anham">
    <div className="contact-card__head">
      <span className="contact-card__avatar contact-card__avatar--anham"><IconAnkh /></span>
      <div><span className="contact-card__label">{label}</span><h2 id="cabinet-anham-title">{title}</h2></div>
    </div>
    <p className="contact-card__anham-text">{text}</p>
    <div className="contact-card__prompts">
      {questions.slice(0, 3).map((question) => <button key={question} onClick={() => openAnham(question)} type="button">{question}</button>)}
    </div>
    <button className="contact-card__anham-button" onClick={() => openAnham()} type="button">{button}<span>→</span></button>
    <p className="contact-card__boundary">{boundary}</p>
  </section>;
}
