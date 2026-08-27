import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { RecoveryForm } from "./RecoveryForm";

type RecoveryPageProps = {
  searchParams?: Promise<{ message?: string | string[] }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale()).recovery;

  return { title: t.title, description: t.description };
}

export default async function RecoveryPage({ searchParams }: RecoveryPageProps) {
  const t = getDictionary(await getLocale()).recovery;
  const params = await searchParams;
  const message = Array.isArray(params?.message)
    ? params?.message[0]
    : params?.message;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      {message === "link-invalid" ? (
        <p className="form-message form-message--error">
          {t.expired}
        </p>
      ) : null}

      <section className="auth-layout">
        <div className="auth-panel">
          <RecoveryForm labels={t} />
        </div>
        <div className="panel">
          <span className="panel__label">{t.howLabel}</span>
          <h2>{t.howTitle}</h2>
          <p>
            {t.howText}
          </p>
          <p>
            {t.rememberedPrefix}
            <Link href="/login">{t.rememberedLink}</Link>
            {t.noLetterPrefix}
            <Link href="/support">{t.supportLink}</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
