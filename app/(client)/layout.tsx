import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { resolveAssistantTierForUi } from "@/lib/assistant/tiers";
import { getLocale } from "@/lib/i18n/locale";

type LayoutProps = {
  children: React.ReactNode;
};

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
