import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { navRoutes } from "@/lib/routes";

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
    <html lang="ru">
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
          <nav aria-label="Документы">
            <Link href="/legal/offer">Публичная оферта</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
