import { getMissingSupabaseEnvVars } from "@/lib/supabase/env";

type AuthSetupNoticeProps = {
  title?: string;
};

export function AuthSetupNotice({
  title = "Supabase Auth is not configured"
}: AuthSetupNoticeProps) {
  const missingVars = getMissingSupabaseEnvVars();

  if (missingVars.length === 0) {
    return null;
  }

  return (
    <div className="notice notice--warning">
      <span className="panel__label">Setup required</span>
      <h2>{title}</h2>
      <p>
        Add the missing environment variables before authentication requests can
        run:
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
