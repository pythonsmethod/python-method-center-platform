import { notFound } from "next/navigation";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { createGoogleWorkloadIdentityAccessToken } from "@/lib/document-extraction/google-workload-identity";
import { getLocale } from "@/lib/i18n/locale";

export const dynamic = "force-dynamic";

export default async function AnhamWifSmokePage() {
  const [auth, locale] = await Promise.all([
    getRequiredStaffUser("/admin/anham/wif-smoke"),
    getLocale(),
  ]);

  if (
    auth.status !== "authorized" ||
    auth.role !== "admin" ||
    process.env.VERCEL_ENV !== "preview" ||
    process.env.ANHAM_PHI_PROCESSING_AUTHORIZED !== "false"
  ) {
    notFound();
  }

  let ok = false;
  let failureCode = "none";
  try {
    const token = await createGoogleWorkloadIdentityAccessToken()();
    ok = token.length > 0;
  } catch (error) {
    ok = false;
    const message = error instanceof Error ? error.message : "unknown";
    failureCode = [
      "Google identity configuration missing",
      "Google identity configuration invalid",
      "Google identity token is invalid",
      "sts_exchange_failed",
      "service_account_exchange_failed",
      "Google identity exchange returned no token",
      "Google identity exchange returned no access token",
    ].includes(message) ? message : "unknown";
  }

  const copy = locale === "ru"
    ? {
        eyebrow: "Anham · Preview",
        title: "Проверка Google Workload Identity",
        success: "Временная авторизация Vercel → Google работает.",
        failure: "Обмен временной авторизации не прошёл.",
        safe: "Документы и медицинские данные не отправлялись. Постоянный Google-ключ не использовался.",
      }
    : {
        eyebrow: "Anham · Preview",
        title: "Google Workload Identity check",
        success: "Temporary Vercel → Google authorization works.",
        failure: "The temporary authorization exchange did not succeed.",
        safe: "No documents or medical data were sent. No permanent Google key was used.",
      };

  return (
    <main className="page-shell">
      <section className={`notice ${ok ? "notice--success" : "notice--warning"}`}>
        <span className="panel__label">{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p>{ok ? copy.success : copy.failure}</p>
        <p>{copy.safe}</p>
        <dl>
          <div><dt>credential</dt><dd>{ok ? "short_lived" : "not_issued"}</dd></div>
          <div><dt>failureStage</dt><dd>{failureCode}</dd></div>
          <div><dt>documentSent</dt><dd>false</dd></div>
          <div><dt>phiSent</dt><dd>false</dd></div>
        </dl>
      </section>
    </main>
  );
}
