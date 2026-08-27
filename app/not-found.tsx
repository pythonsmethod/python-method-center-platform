import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();

  return {
    title: locale === "ru" ? "Страница не найдена" : "Page not found",
    description:
      locale === "ru"
        ? "Такой страницы на сайте нет."
        : "This page does not exist on the site.",
    // The root layout points every page at itself. An address that returns
    // 404 must not name itself the canonical version of anything.
    alternates: { canonical: null },
    robots: { index: false, follow: false }
  };
}

export default async function NotFound() {
  const locale = await getLocale();
  const copy = locale === "ru"
    ? {
        eyebrow: "Ошибка 404",
        title: "Страница не найдена",
        text: "Возможно, адрес изменился или в ссылке есть ошибка. Вернитесь на главную страницу или откройте поддержку.",
        home: "На главную",
        support: "Написать в поддержку"
      }
    : {
        eyebrow: "Error 404",
        title: "Page not found",
        text: "The address may have changed, or the link may contain a mistake. Return to the home page or open support.",
        home: "Go to home page",
        support: "Contact support"
      };

  return (
    <div className="page-shell">
      <div className="panel">
        <span className="panel__label">{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p>{copy.text}</p>
        <div className="panel-actions">
          <Link className="button" href="/">{copy.home}</Link>
          <Link className="button button--secondary" href="/support">
            {copy.support}
          </Link>
        </div>
      </div>
    </div>
  );
}
