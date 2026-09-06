import Image from "next/image";
import { IconAnkh } from "@/components/icons/EgyptianIcons";
import type { Locale } from "@/lib/i18n/locale";

type Props = { locale: Locale; appStore: string | null; googlePlay: string | null };

// The app promotion is the one part of the withdrawn homepage the owner kept.
export function HomeAppPromo({ locale, appStore, googlePlay }: Props) {
  const ru = locale === "ru";
  return (
    <aside className="home-app-promo" aria-labelledby="home-app-promo-title">
      <div className="home-app-promo__preview" aria-hidden="true">
        <IconAnkh />
        <Image src="/images/anham-master.png" width={1024} height={1024} sizes="110px" alt="" />
      </div>
      <div className="home-app-promo__copy">
        <p className="home-app-promo__eyebrow">{ru ? "ПРИЛОЖЕНИЕ PYTHON METHOD" : "PYTHON METHOD APP"}</p>
        <h2 id="home-app-promo-title">{ru ? "Больше возможностей — в приложении" : "More possibilities in the app"}</h2>
        <p>{ru ? "Ваш личный кабинет, Анхам, история, программы и весь ваш путь в одном месте." : "Your account, Anham, history, programs and your entire journey in one place."}</p>
        <div className="home-app-promo__stores">
          {[["App Store", appStore], ["Google Play", googlePlay]].map(([label, href]) => href ? (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer">{label}<span aria-hidden="true">↗</span></a>
          ) : (
            <span key={label}>{label}<small>{ru ? "Скоро" : "Coming soon"}</small></span>
          ))}
        </div>
      </div>
    </aside>
  );
}
