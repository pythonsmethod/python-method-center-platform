import type { Metadata } from "next";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import { navRoutes } from "@/lib/routes";
import { socialLinks } from "@/lib/config/socials";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const playfair = Playfair_Display({
  subsets: ["cyrillic", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-playfair",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Python Method — сопровождение восстановления",
  description:
    "Клиентская платформа Python Method: анкета, медицинские документы, связь с командой и оплата сопровождения."
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <html className={playfair.variable} lang={locale}>
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            Python Method
          </Link>
          <div className="site-header__right">
            <nav aria-label="Main navigation">
              {navRoutes.map((route) => (
                <Link key={route.href} href={route.href}>
                  {dict.nav[route.href] ?? route.label}
                </Link>
              ))}
            </nav>
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
            <Link href="/support">{dict.footer.support}</Link>
            <Link href="/admin">{dict.footer.team}</Link>
          </nav>
          <p className="site-footer__disclaimer">{dict.footer.disclaimer}</p>
        </footer>
      </body>
    </html>
  );
}
