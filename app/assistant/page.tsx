import { notFound, redirect } from "next/navigation";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { resolvePrivateAssistantRole } from "@/lib/auth/require-karen";
import { getPrivateAssistantUserState } from "@/lib/auth/require-private-assistant";
import { getLocale } from "@/lib/i18n/locale";

export const metadata = { robots: { index: false, follow: false } };

export default async function AssistantPage() {
  const auth = await getPrivateAssistantUserState();
  if (auth.status === "unauthenticated") redirect("/login?next=/assistant");
  if (auth.status !== "authorized" || !resolvePrivateAssistantRole(auth.email)) notFound();
  const locale = await getLocale();
  return <main className="page-shell page-shell--wide">
    <h1>{locale === "ru" ? "Разговор с Анхамом" : "Talk to Anham"}</h1>
    <p>{locale === "ru" ? "Нажмите на Анхама рядом с микрофоном, чтобы начать голосовой разговор. Ваша переписка сохраняется в вашем аккаунте." : "Click Anham beside the microphone to start a voice conversation. Your conversation is saved in your account."}</p>
    <AssistantChat endpoint="/api/assistant/staff" voiceScope="staff" locale={locale} attachments intro={locale === "ru" ? "Здравствуйте! Чем помочь?" : "Hello! How can I help?"} />
  </main>;
}
