import { Link } from "@/components/LocaleLink";
import { notFound } from "next/navigation";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { DigestRefreshButton } from "@/app/(admin)/admin/medical-digest/DigestRefreshButton";
import { getKarenAssistantUserState } from "@/lib/auth/require-karen";
import { getLocale } from "@/lib/i18n/locale";
import { listMedicalDigestIssues } from "@/lib/medical-digest/digest";
import type { MedicalDigestCategory } from "@/lib/medical-digest/types";

type MedicalDigestPageProps = {
  searchParams: Promise<{ date?: string }>;
};

const categoryOrder: MedicalDigestCategory[] = ["rehabilitation", "oncology", "discoveries"];

export const dynamic = "force-dynamic";

export default async function MedicalDigestPage({ searchParams }: MedicalDigestPageProps) {
  const [auth, locale, params] = await Promise.all([
    getKarenAssistantUserState(),
    getLocale(),
    searchParams
  ]);
  const ru = locale === "ru";

  if (auth.status === "missing-env") {
    return <div className="page-shell"><AuthSetupNotice title="Supabase Auth" /></div>;
  }
  if (auth.status === "forbidden") notFound();
  if (auth.status === "error") {
    return <div className="page-shell"><p className="form-message form-message--error">{auth.message}</p></div>;
  }

  const issues = await listMedicalDigestIssues();
  const selected = issues.find((issue) => issue.issueDate === params.date) ?? issues[0] ?? null;
  const categoryLabels: Record<MedicalDigestCategory, { title: string; eyebrow: string }> = ru
    ? {
        rehabilitation: { title: "Реабилитация", eyebrow: "Восстановление и качество жизни" },
        oncology: { title: "Онкология", eyebrow: "Клинические исследования и обзоры" },
        discoveries: { title: "Новые открытия", eyebrow: "Перспективные методы и технологии" }
      }
    : {
        rehabilitation: { title: "Rehabilitation", eyebrow: "Recovery and quality of life" },
        oncology: { title: "Oncology", eyebrow: "Clinical studies and reviews" },
        discoveries: { title: "New discoveries", eyebrow: "Emerging methods and technologies" }
      };
  const dateFormatter = new Intl.DateTimeFormat(ru ? "ru-RU" : "en-US", {
    dateStyle: "long",
    timeZone: "America/Los_Angeles"
  });
  const timeFormatter = new Intl.DateTimeFormat(ru ? "ru-RU" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
    timeZoneName: "short"
  });

  return (
    <div className="page-shell page-shell--wide medical-digest">
      <header className="medical-digest__hero">
        <div>
          <span>{ru ? "Anham · доказательная редакция" : "Anham · evidence desk"}</span>
          <h1>{ru ? "Утренний медицинский обзор" : "Morning medical digest"}</h1>
          <p>{ru
            ? "Свежие публикации о реабилитации, онкологии и новых медицинских разработках — с прямыми ссылками на первоисточники."
            : "Recent publications on rehabilitation, oncology, and emerging medical research — with direct links to primary sources."}</p>
        </div>
        <DigestRefreshButton locale={locale} />
      </header>

      <div className="medical-digest__trust" role="note">
        <strong>{ru ? "Как читать обзор" : "How to read this digest"}</strong>
        <span>{ru
          ? "Карточки являются редакционным пересказом аннотаций, а не рекомендациями по лечению. Перед клиническим применением откройте полный текст исследования."
          : "Cards are editorial summaries of abstracts, not treatment recommendations. Review the full study before any clinical application."}</span>
      </div>

      {selected ? (
        <>
          <section className="medical-digest__issue-head" aria-labelledby="digest-issue-title">
            <div>
              <span>{ru ? "Выпуск" : "Issue"}</span>
              <h2 id="digest-issue-title">{dateFormatter.format(new Date(`${selected.issueDate}T12:00:00Z`))}</h2>
              <p>{ru ? "Обновлено" : "Updated"} {timeFormatter.format(new Date(selected.generatedAt))} · {selected.sourceCount} {ru ? "источников" : "sources"}</p>
            </div>
            <nav aria-label={ru ? "Архив выпусков" : "Issue archive"} className="medical-digest__archive">
              {issues.map((issue) => (
                <Link
                  aria-current={issue.id === selected.id ? "page" : undefined}
                  className={issue.id === selected.id ? "is-active" : undefined}
                  href={`/admin/medical-digest?date=${issue.issueDate}`}
                  key={issue.id}
                >
                  {new Intl.DateTimeFormat(ru ? "ru-RU" : "en-US", { day: "2-digit", month: "short", timeZone: "UTC" })
                    .format(new Date(`${issue.issueDate}T12:00:00Z`))}
                </Link>
              ))}
            </nav>
          </section>

          {categoryOrder.map((category) => {
            const articles = selected.articles.filter((article) => article.category === category);
            if (articles.length === 0) return null;
            const labels = categoryLabels[category];
            return (
              <section className="medical-digest__category" key={category}>
                <header>
                  <span>{labels.eyebrow}</span>
                  <h2>{labels.title}</h2>
                </header>
                <div className="medical-digest__grid">
                  {articles.map((article) => (
                    <article className="medical-digest__card" key={article.id}>
                      <div className="medical-digest__meta">
                        <span>{article.publicationType}</span>
                        <time dateTime={article.publishedAt}>{article.publishedAt}</time>
                      </div>
                      <h3>{article.title}</h3>
                      <p>{ru ? article.summaryRu : article.summaryEn}</p>
                      <dl>
                        <div>
                          <dt>{ru ? "Почему важно" : "Why it matters"}</dt>
                          <dd>{ru ? article.significanceRu : article.significanceEn}</dd>
                        </div>
                        <div>
                          <dt>{ru ? "Ограничения" : "Limitations"}</dt>
                          <dd>{ru ? article.limitationsRu : article.limitationsEn}</dd>
                        </div>
                      </dl>
                      <footer>
                        <span>{article.journal}</span>
                        <a href={article.sourceUrl} rel="noreferrer" target="_blank">
                          {ru ? "Открыть первоисточник" : "Open primary source"} ↗
                        </a>
                      </footer>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </>
      ) : (
        <section className="medical-digest__empty">
          <span aria-hidden="true">⌁</span>
          <h2>{ru ? "Первый выпуск ещё не собран" : "The first issue has not been built yet"}</h2>
          <p>{ru
            ? "Нажмите «Обновить сейчас». Anham найдёт свежие индексированные публикации, подготовит двуязычный разбор и сохранит выпуск в архиве."
            : "Select “Refresh now.” Anham will find recently indexed publications, prepare a bilingual review, and save the issue to the archive."}</p>
        </section>
      )}
    </div>
  );
}

