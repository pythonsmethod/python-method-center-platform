import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { resolveAssistantTierForUi } from "@/lib/assistant/tiers";
import { getLocale } from "@/lib/i18n/locale";

type LayoutProps = {
  children: React.ReactNode;
};

// Registration, recovery and password reset had no Анхам at all — the one
// stretch of the path where people most often get stuck and leave. He is
// present here for the same reason he is present everywhere else.
export default async function GroupLayout({ children }: LayoutProps) {
  const [locale, tier] = await Promise.all([
    getLocale(),
    resolveAssistantTierForUi()
  ]);

  return (
    <>
      {children}
      <AssistantWidget locale={locale} tier={tier} />
    </>
  );
}
