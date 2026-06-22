import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { AuthForm } from "./AuthForm";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
  }>;
};

function sanitizeNextPath(value: string | string[] | undefined): string {
  const nextPath = Array.isArray(value) ? value[0] : value;

  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/cabinet";
  }

  return nextPath;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params?.next);
  const supabaseConfigured = hasSupabaseEnv();

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Authentication"
        title="Login"
        description="Sign in or create an account with Supabase Auth email and password."
      />

      <AuthSetupNotice />

      <section className="auth-layout">
        <AuthForm
          nextPath={nextPath}
          supabaseConfigured={supabaseConfigured}
        />
        <div className="panel">
          <span className="panel__label">Auth foundation</span>
          <h2>Supabase session flow</h2>
          <p>
            This page sends email and password credentials to Supabase Auth.
            It does not create fake sessions or hardcoded users.
          </p>
        </div>
      </section>
    </div>
  );
}
