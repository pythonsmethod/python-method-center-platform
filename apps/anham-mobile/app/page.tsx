import type { Metadata } from "next";
import { AnhamApp } from "@/components/AnhamApp";
import { isDesignTab, type DesignLocale } from "@/lib/design-model";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function localeFrom(value: string | string[] | undefined): DesignLocale {
  return value === "en" ? "en" : "ru";
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const locale = localeFrom(params.lang);
  return {
    title: locale === "ru" ? "Anham · приложение" : "Anham · app",
    description:
      locale === "ru"
        ? "Анхам — ежедневный ИИ-проводник по долголетию."
        : "Anham is your daily AI longevity companion."
  };
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const locale = localeFrom(params.lang);
  const screen = isDesignTab(params.tab) ? params.tab : "anham";

  return (
    <main>
      <AnhamApp screen={screen} locale={locale} gallery={false} />
    </main>
  );
}
