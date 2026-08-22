"use client";

import { useActionState } from "react";
import {
  addKnowledgeEntry,
  setKnowledgeEntryActive
} from "@/lib/assistant/actions";
import { initialStaffActionState } from "@/lib/cases/staff-types";
import type { KnowledgeEntry } from "@/lib/assistant/knowledge";
import type { Locale } from "@/lib/i18n/locale";
import type { PrivateAssistantRole } from "@/lib/auth/require-karen";

type KnowledgePanelProps = {
  entries: KnowledgeEntry[];
  loadError: string | null;
  locale?: Locale;
  role?: PrivateAssistantRole;
};

export function KnowledgePanel({
  entries,
  loadError,
  locale = "ru",
  role = "karen"
}: KnowledgePanelProps) {
  const [addState, addAction, addPending] = useActionState(
    addKnowledgeEntry,
    initialStaffActionState
  );
  const [toggleState, toggleAction, togglePending] = useActionState(
    setKnowledgeEntryActive,
    initialStaffActionState
  );
  const t = locale === "ru"
    ? {
        title: "Заголовок",
        titlePlaceholder: "Например: Как отвечать про цены",
        audience: "Для кого это знание",
        clientAi: "Только для ИИ клиентов",
        staffAi: "Только для личных ИИ Анны и Карена",
        bothAi: "Для личных ИИ и ИИ клиентов",
        topic: "Раздел",
        general: "Общее знание",
        sleep: "Про сон — видно клиентам в разделе «Мой сон»",
        content: "Текст знания",
        contentPlaceholder: "Принцип, наблюдение, факт или формулировка, которую ИИ должен запомнить и использовать.",
        saving: "Сохраняю…",
        save: "Сохранить знание",
        unavailable: "База знаний недоступна",
        migration: "Возможно, обновление базы ещё не применено.",
        off: "выключено",
        disable: "Выключить",
        enable: "Включить",
        empty: role === "founder"
          ? "Пока нет сохранённых знаний. Добавьте первый принцип платформы."
          : "Пока нет сохранённых знаний. Добавьте первый принцип методики.",
        audienceLabels: { client: "ИИ клиентов", staff: "Личные ИИ Анны и Карена", both: "Личные ИИ + ИИ клиентов" }
      }
    : {
        title: "Title",
        titlePlaceholder: "For example: How to answer pricing questions",
        audience: "Who should use this knowledge",
        clientAi: "Client AI only",
        staffAi: "Anna and Karen's personal AIs only",
        bothAi: "Personal AIs and client AI",
        topic: "Section",
        general: "General knowledge",
        sleep: "Sleep — visible to clients in My Sleep",
        content: "Knowledge text",
        contentPlaceholder: "A principle, observation, fact, or wording the AI should remember and use.",
        saving: "Saving…",
        save: "Save knowledge",
        unavailable: "Knowledge base unavailable",
        migration: "The database update may not have been applied yet.",
        off: "disabled",
        disable: "Disable",
        enable: "Enable",
        empty: "There is no saved knowledge yet. Add the first principle or observation and the personal AI will begin using it.",
        audienceLabels: { client: "Client AI", staff: "Anna and Karen's personal AIs", both: "Personal AIs + client AI" }
      };

  return (
    <div className="knowledge-panel">
      <form action={addAction} className="knowledge-panel__form">
        <label>
          {t.title}
          <input maxLength={200} name="title" placeholder={t.titlePlaceholder} required type="text" />
        </label>
        <label>
          {t.audience}
          <select defaultValue="both" name="audience">
            <option value="client">{t.clientAi}</option>
            <option value="staff">{t.staffAi}</option>
            <option value="both">{t.bothAi}</option>
          </select>
        </label>
        <label>
          {t.topic}
          <select defaultValue="general" name="topic">
            <option value="general">{t.general}</option>
            <option value="sleep">{t.sleep}</option>
          </select>
        </label>
        <label>
          {t.content}
          <textarea
            maxLength={8000}
            name="content"
            placeholder={t.contentPlaceholder}
            required
            rows={4}
          />
        </label>
        <button className="button" disabled={addPending} type="submit">
          {addPending ? t.saving : t.save}
        </button>
        {addState.status !== "idle" ? (
          <p className={`form-message form-message--${addState.status}`}>
            {addState.message}
          </p>
        ) : null}
      </form>

      {loadError ? (
        <p className="form-message form-message--error">
          {t.unavailable}: {loadError}. {t.migration}
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
                  {t.audienceLabels[entry.audience]}
                  {entry.is_active ? "" : ` · ${t.off}`}
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
                  {entry.is_active ? t.disable : t.enable}
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : !loadError ? (
        <p className="knowledge-panel__empty">
          {t.empty}
        </p>
      ) : null}
    </div>
  );
}
