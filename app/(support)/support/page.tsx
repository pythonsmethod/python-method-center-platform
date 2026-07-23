import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { EmergencyNotice } from "@/components/EmergencyNotice";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";

export default async function SupportPage() {
  const locale = await getLocale();
  const t = getDictionary(locale).support;

  return (
    <div className="page-shell">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">{t.label}</span>
          <h2>{t.cardTitle}</h2>
          <p>
            {t.cardText1} <Link href="/cabinet">{t.cabinetLink}</Link>
            {t.cardText2}
          </p>
        </div>
      </section>

      <EmergencyNotice />
    </div>
  );
}
