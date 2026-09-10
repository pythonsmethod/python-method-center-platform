import { notFound } from "next/navigation";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getLocale } from "@/lib/i18n/locale";
import { isClientVoicePilot } from "@/lib/assistant/client-voice-pilot";
import { resolveAssistantTierForUi } from "@/lib/assistant/tiers";

export const metadata = { robots: { index: false, follow: false } };
export default async function ClientAssistantPage() {
  const auth = await getRequiredUser("/cabinet/assistant");
  if (auth.status !== "authenticated" || !isClientVoicePilot(auth.email)) notFound();
  const locale = await getLocale();
  const tier = await resolveAssistantTierForUi();
  return <section className="panel">
    <h1>{locale === "ru" ? "Мой Анхам" : "My Anham"}</h1>
    <p>{locale === "ru" ? "Тест новых возможностей для клиентов. Обсуждайте свой случай и работу с личным кабинетом. Нажмите аватар Анхама рядом с микрофоном для голосового разговора." : "Preview of new client features. Discuss your own case and using your account. Click Anham's avatar beside the microphone to talk."}</p>
    <AssistantChat endpoint="/api/assistant/client" historyEndpoint="/api/assistant/history" voiceScope="client" attachments={tier === "client"} locale={locale} intro={locale === "ru" ? "Здравствуйте! Чем помочь с вашим случаем или личным кабинетом?" : "Hello! How can I help with your case or account?"} />
  </section>;
}
