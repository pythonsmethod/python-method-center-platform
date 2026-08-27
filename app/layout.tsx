import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import { isFreeReviewActive } from "@/lib/config/promo";
import { SITE_URL } from "@/lib/config/site";
import { socialLinks } from "@/lib/config/socials";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteNav, type NavViewer } from "@/components/SiteNav";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppRouteMode } from "@/components/AppRouteMode";
import { PublicMobileDock } from "@/components/PublicMobileDock";

// Who is looking at the header. Not merely whether anyone is signed in:
// a member of the team leaving the workspace used to land on the
// client-facing site whose only account door led to the client cabinet,
// with the way back buried in the footer. It reads exactly like being
// logged out and returned as somebody else.
//
// Never throws, and never blocks the page on this: a nav must render even
// if auth is unreachable, and the worst case is a staff member seeing the
// client door for one page load.
async function headerViewer(): Promise<NavViewer> {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return "anonymous";
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return "anonymous";
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    return profile?.role === "admin" || profile?.role === "support"
      ? "staff"
      : "client";
  } catch {
    return "anonymous";
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
// Google Search Console offers several ways to prove the site is ours. The
// HTML-tag method is the only one that needs a code change, which would
// otherwise mean waiting on a deploy in the middle of setting it up. Paste
// the code from Search Console into NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION in
// Vercel, redeploy, press Verify.
//
// Only the token belongs here — not the whole <meta> tag Search Console
// shows. It is a public value by design: it appears in the page source of
// every site that uses this method, and it proves ownership only to Google.
function verificationTokens(): Metadata["verification"] {
  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

  return google ? { google } : undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale()).meta;

  return {
    applicationName: "Python Method Center",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Python Method"
    },
    formatDetection: {
      telephone: false
    },
    // Generated from public/images/anham-master.png, which stays the master
    // artwork. It was being linked here directly: a 1.66 MB 1024x1024 PNG,
    // unoptimised, fetched as the browser-tab icon of every page. The
    // favicon below is 1.7 KB.
    icons: {
      apple: [
        {
          url: "/icons/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png"
        }
      ],
      icon: [
        { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
      ]
    },
    verification: verificationTokens(),
    // One canonical address per page ("./" resolves to the current path),
    // so search engines never index the same page under two names.
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: "./" },
    title: {
      default: t.title,
      template: `%s | Python Method Center`
    },
    // The promo sentence is appended, never baked in: the day the free
    // review ends, this line stops promising it without a code change.
    description: isFreeReviewActive()
      ? `${t.description} ${t.descriptionFree}`
      : t.description,
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

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#100d08",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const viewer = await headerViewer();

  return (
    <html className={playfair.variable} lang={locale}>
      <body>
        <AppRouteMode />
        <SiteHeader>
          <Link className="brand" href="/">
            Python Method Center
          </Link>
          <div className="site-header__right">
            <SiteNav labels={dict.nav} viewer={viewer} />
            <LanguageSwitcher locale={locale} />
          </div>
        </SiteHeader>
        <main>{children}</main>
        <PublicMobileDock locale={locale} viewer={viewer} />
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
          <nav aria-label={locale === "ru" ? "Дополнительно" : "More"}>
            <Link href="/professor">{dict.footer.professor}</Link>
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
