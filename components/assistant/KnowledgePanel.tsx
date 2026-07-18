"use client";

import { useActionState } from "react";
import {
  addKnowledgeEntry,
  setKnowledgeEntryActive
} from "@/lib/assistant/actions";
import { initialStaffActionState } from "@/lib/cases/staff-types";
import type { KnowledgeEntry } from "@/lib/assistant/knowledge";

const audienceLabels: Record<KnowledgeEntry["audience"], string> = {
  client: "ИИ клиентов",
  staff: "ИИ Карена",
  both: "Оба ИИ"
};

type KnowledgePanelProps = {
  entries: KnowledgeEntry[];
  loadError: string | null;
};

export function KnowledgePanel({ entries, loadError }: KnowledgePanelProps) {
  const [addState, addAction, addPending] = useActionState(
    addKnowledgeEntry,
    initialStaffActionState
  );
  const [toggleState, toggleAction, togglePending] = useActionState(
    setKnowledgeEntryActive,
    initialStaffActionState
  );

  return (
    <div className="knowledge-panel">
      <form action={addAction} className="knowledge-panel__form">
        <label>
          Заголовок
          <input maxLength={200} name="title" placeholder="Например: Как отвечать про цены" required type="text" />
        </label>
        <label>
          Для кого это знание
          <select defaultValue="client" name="audience">
            <option value="client">Для ИИ клиентов (на сайте)</option>
            <option value="staff">Для ИИ Карена (в админке)</option>
            <option value="both">Для обоих</option>
          </select>
        </label>
        <label>
          Текст знания
          <textarea
            maxLength={8000}
            name="content"
            placeholder="Правило, факт или готовая формулировка, которую ИИ должен использовать в ответах."
            required
            rows={4}
          />
        </label>
        <button className="button" disabled={addPending} type="submit">
          {addPending ? "Сохраняю…" : "Сохранить знание"}
        </button>
        {addState.status !== "idle" ? (
          <p className={`form-message form-message--${addState.status}`}>
            {addState.message}
          </p>
        ) : null}
      </form>

      {loadError ? (
        <p className="form-message form-message--error">
          База знаний недоступна: {loadError}. Возможно, миграция ещё не применена.
        </p>
      ) : null}

      {toggleState.status === "error" ? (
        <p className="form-message form-message--error">{toggleState.message}</p>
      ) : null}

      {entries.length > 0 ? (
        <ul className="knowledge-panel__list">
          {entries.map((entry) => (
            <li className={entry.is_active ? "" : "knowledge-panel__item--off"} key={entry.id}>
              <div>
                <strong>{entry.title}</strong>
                <span className="knowledge-panel__meta">
                  {audienceLabels[entry.audience]}
                  {entry.is_active ? "" : " · выключено"}
                </span>
                <p>{entry.content}</p>
              </div>
              <form action={toggleAction}>
                <input name="entryId" type="hidden" value={entry.id} />
                <input
                  name="nextActive"
                  type="hidden"
                  value={entry.is_active ? "false" : "true"}
                />
                <button
                  className="button button--secondary"
                  disabled={togglePending}
                  type="submit"
                >
                  {entry.is_active ? "Выключить" : "Включить"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : !loadError ? (
        <p className="knowledge-panel__empty">
          Пока нет знаний. Добавьте первое — например, ответы на частые вопросы
          клиентов, — и ИИ клиентов начнёт использовать его.
        </p>
      ) : null}
    </div>
  );
}
