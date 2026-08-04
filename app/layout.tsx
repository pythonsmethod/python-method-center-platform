import type { Metadata } from "next";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/config/site";
import { socialLinks } from "@/lib/config/socials";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SiteNav } from "@/components/SiteNav";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// One door, two names: the last nav item needs to know whether anyone is
// home. Never throws — a nav must render even if auth is unreachable.
async function isSignedIn(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return false;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    return Boolean(user);
  } catch {
    return false;
  }
}

const playfair = Playfair_Display({
  subsets: ["cyrillic", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-playfair",
  display: "swap"
});

// Title, description and the share card follow the visitor's language.
// They were fixed in Russian, so an English visitor got a Russian browser
// tab on every page, Russian text in search results, and a Russian preview
// whenever they shared a link.
export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale()).meta;

  return {
    // One canonical address per page ("./" resolves to the current path),
    // so search engines never index the same page under two names.
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: "./" },
    title: t.title,
    description: t.description,
    openGraph: {
      siteName: "Python Method Center",
      title: t.ogTitle,
      description: t.ogDescription,
      url: "./",
      type: "website",
      locale: t.ogLocale
    }
  };
}

type RootLayoutProps = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const signedIn = await isSignedIn();

  return (
    <html className={playfair.variable} lang={locale}>
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            Python Method
          </Link>
          <div className="site-header__right">
            <SiteNav labels={dict.nav} signedIn={signedIn} />
            <LanguageSwitcher locale={locale} />
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <span>© Python Method</span>
          {socialLinks.length > 0 ? (
            <nav aria-label={dict.footer.socials}>
              {socialLinks.map((link) => (
                <a
                  href={link.href}
                  key={link.label}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          ) : null}
          <nav aria-label="More">
            <Link href="/legal/offer">{dict.footer.offer}</Link>
            <Link href="/legal/privacy">{dict.footer.privacy}</Link>
            <Link href="/legal/refund">{dict.footer.refund}</Link>
            <Link href="/support">{dict.footer.support}</Link>
            <Link href="/admin">{dict.footer.team}</Link>
          </nav>
          <p className="site-footer__disclaimer">{dict.footer.disclaimer}</p>
        </footer>
      </body>
    </html>
  );
}
