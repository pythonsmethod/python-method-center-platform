import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { appRoutes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Python Method Platform",
  description: "Runnable scaffold for the Python Method web-first platform."
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            Python Method
          </Link>
          <nav aria-label="Primary navigation">
            {appRoutes.map((route) => (
              <Link key={route.href} href={route.href}>
                {route.label}
              </Link>
            ))}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
