import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { PRIVACY_CONTENT, POLICY_UPDATED_ISO } from "@/lib/legal/policy-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale()).privacy;

  return { title: `${t.title} — Python Method`, description: t.description };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  const t = getDictionary(locale).privacy;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <LegalDocumentView
        doc={PRIVACY_CONTENT[locale]}
        questionsLink={t.questionsLink}
        questionsPrefix={t.questionsPrefix}
        related={[
          { href: "/legal/offer", label: t.relatedOffer },
          { href: "/legal/refund", label: t.relatedRefund }
        ]}
        updatedDate={new Date(POLICY_UPDATED_ISO).toLocaleDateString(
          locale === "en" ? "en-GB" : "ru-RU",
          { day: "numeric", month: "long", year: "numeric" }
        )}
        updatedLabel={t.updatedLabel}
      />
    </div>
  );
}
