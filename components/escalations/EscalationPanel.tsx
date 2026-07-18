"use client";

import { useActionState } from "react";
import { acknowledgeEscalation } from "@/lib/escalations/actions";
import { initialStaffActionState } from "@/lib/cases/staff-types";
import type { EscalationListItem } from "@/lib/escalations/queries";

const categoryLabels: Record<string, string> = {
  physical_medical: "Физический / медицинский",
  psychological_crisis: "Психологический кризис",
  technical_abuse: "Технический",
  other: "Другое"
};

const routingLabels: Record<string, string> = {
  karen: "Карен",
  support: "Поддержка (Анна)",
  admin: "Админ"
};

type EscalationPanelProps = {
  escalations: EscalationListItem[];
  loadError: string | null;
};

export function EscalationPanel({ escalations, loadError }: EscalationPanelProps) {
  const [state, action, pending] = useActionState(
    acknowledgeEscalation,
    initialStaffActionState
  );

  if (loadError) {
    return (
      <p className="form-message form-message--error">
        Красные флаги недоступны: {loadError}
      </p>
    );
  }

  if (escalations.length === 0) {
    return (
      <p className="escalation-empty">
        Открытых красных флагов нет. Автоматические сигналы из чата ИИ появятся
        здесь сразу после фиксации.
      </p>
    );
  }

  return (
    <div className="escalation-list">
      {state.status === "error" ? (
        <p className="form-message form-message--error">{state.message}</p>
      ) : null}
      <ul>
        {escalations.map((item) => {
          const excerpt =
            typeof item.signals?.message_excerpt === "string"
              ? item.signals.message_excerpt
              : null;

          return (
            <li key={item.id}>
              <div className="escalation-item__head">
                <strong>{categoryLabels[item.category] ?? item.category}</strong>
                <span>→ {routingLabels[item.routing_target] ?? item.routing_target}</span>
              </div>
              <p className="escalation-item__meta">
                {new Date(item.created_at).toLocaleString("ru-RU")} ·{" "}
                {item.profiles?.email ?? "гость сайта (не в системе)"}
              </p>
              {excerpt ? (
                <p className="escalation-item__excerpt">«{excerpt}»</p>
              ) : null}
              <form action={action}>
                <input name="escalationId" type="hidden" value={item.id} />
                <button
                  className="button button--secondary"
                  disabled={pending}
                  type="submit"
                >
                  Отметить обработанным
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
