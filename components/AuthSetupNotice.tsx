import { getMissingSupabaseEnvVars } from "@/lib/supabase/env";

type AuthSetupNoticeLabels = {
  label: string;
  text: string;
};

type AuthSetupNoticeProps = {
  title?: string;
  // The notice is shown by client-facing pages and by the team workspace
  // alike. The workspace stays Russian, so the wording is handed in and
  // the Russian default covers the staff side.
  labels?: AuthSetupNoticeLabels;
};

const RU: AuthSetupNoticeLabels = {
  label: "Требуется настройка",
  text: "Добавьте недостающие переменные окружения, чтобы аутентификация заработала:"
};

export function AuthSetupNotice({
  title = "Supabase Auth не настроен",
  labels = RU
}: AuthSetupNoticeProps) {
  const missingVars = getMissingSupabaseEnvVars();

  if (missingVars.length === 0) {
    return null;
  }

  return (
    <div className="notice notice--warning">
      <span className="panel__label">{labels.label}</span>
      <h2>{title}</h2>
      <p>{labels.text}</p>
      <ul className="status-list">
        {missingVars.map((name) => (
          <li key={name}>
            <code>{name}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
