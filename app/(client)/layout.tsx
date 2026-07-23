import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { getLocale } from "@/lib/i18n/locale";

type LayoutProps = {
  children: React.ReactNode;
};

export default async function GroupLayout({ children }: LayoutProps) {
  const locale = await getLocale();

  return (
    <>
      {children}
      <AssistantWidget locale={locale} />
    </>
  );
}
