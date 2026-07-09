import { getMissingSupabaseEnvVars } from "@/lib/supabase/env";

type AuthSetupNoticeProps = {
  title?: string;
};

export function AuthSetupNotice({
  title = "Supabase Auth не настроен"
}: AuthSetupNoticeProps) {
  const missingVars = getMissingSupabaseEnvVars();

  if (missingVars.length === 0) {
    return null;
  }

  return (
    <div className="notice notice--warning">
      <span className="panel__label">Требуется настройка</span>
      <h2>{title}</h2>
      <p>
        Добавьте недостающие переменные окружения, чтобы аутентификация
        заработала:
      </p>
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
