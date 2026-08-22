import { notFound } from "next/navigation";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { KarenAnhamWorkspace } from "@/components/assistant/KarenAnhamWorkspace";
import { hasAssistantEnv } from "@/lib/assistant/router";
import { canSeeProviderNames } from "@/lib/auth/require-founder";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { isKarenEmail } from "@/lib/auth/require-karen";
import { getLocale } from "@/lib/i18n/locale";

export default async function KarenAssistantPage() {
  const auth = await getRequiredStaffUser("/admin/assistant");
  const locale = await getLocale();

  if (auth.status === "missing-env") {
    return <div className="page-shell"><AuthSetupNotice title="Supabase Auth" /></div>;
  }
  if (auth.status === "forbidden") notFound();
  if (auth.status === "error") {
    return <div className="page-shell"><p className="form-message form-message--error">{auth.message}</p></div>;
  }
  if (auth.status === "authorized" && !isKarenEmail(auth.email)) notFound();

  const configured = hasAssistantEnv();
  const showProviders = canSeeProviderNames(auth.email);
  const t = locale === "ru"
    ? {
        back: "Вернуться обратно",
        chatTitle: "Анхам",
        intro: "Здравствуйте, Professor Python. Расскажите мне новый принцип, наблюдение или задачу — помогу оформить мысль, подготовить материал или решить рабочий вопрос.",
        placeholder: "Напишите мысль, правило или вопрос…",
        suggestions: ["Помоги сформулировать новый принцип", "Собери мои мысли в инструкцию", "Подготовь материал для клиента"],
        unavailable: "Персональный помощник пока не подключён. Обратитесь к администратору платформы."
      }
    : {
        back: "Go back",
        chatTitle: "Anham",
        intro: "Hello, Professor Python. Share a new principle, observation, or task — I can help shape the idea, prepare material, or solve a work question.",
        placeholder: "Write a thought, rule, or question…",
        suggestions: ["Help formulate a new principle", "Turn my thoughts into an instruction", "Prepare client material"],
        unavailable: "The personal assistant is not connected yet. Contact the platform administrator."
      };

  return (
    <div className="page-shell page-shell--wide karen-ai-page">
      <KarenAnhamWorkspace
        configured={configured}
        labels={t}
        showProviders={showProviders}
      />
    </div>
  );
}
