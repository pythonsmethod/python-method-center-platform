import type { Metadata } from "next";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import { navRoutes } from "@/lib/routes";
import { socialLinks } from "@/lib/config/socials";

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

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html className={playfair.variable} lang="ru">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            Python Method
          </Link>
          <nav aria-label="Основная навигация">
            {navRoutes.map((route) => (
              <Link key={route.href} href={route.href}>
                {route.label}
              </Link>
            ))}
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <span>© Python Method</span>
          {socialLinks.length > 0 ? (
            <nav aria-label="Социальные сети">
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
          <nav aria-label="Дополнительно">
            <Link href="/legal/offer">Публичная оферта</Link>
            <Link href="/support">Поддержка</Link>
            <Link href="/admin">Для команды</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
