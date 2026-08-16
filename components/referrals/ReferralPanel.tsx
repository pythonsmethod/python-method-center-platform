"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";

type ReferralPanelProps = {
  code: string;
  link: string;
  invited: number;
  started: number;
  paid: number;
  locale: Locale;
};

const translations = {
  ru: { personal:"Ваш личный код", copied:"Скопировано ✓", copyCode:"Скопировать код", link:"Ссылка для друга", copyLink:"Скопировать ссылку", invited:"Перешли по ссылке и зарегистрировались", started:"Заполнили анкету", paid:"Начали сопровождение", privacy:"Мы не показываем, кто именно перешёл по вашей ссылке, — только общее количество. Личные данные приглашённых остаются приватными." },
  en: { personal:"Your personal code", copied:"Copied ✓", copyCode:"Copy code", link:"Link for a friend", copyLink:"Copy link", invited:"Opened the link and registered", started:"Completed the questionnaire", paid:"Started support", privacy:"We do not show who followed your link — only the total number. Invitees' personal data stays private." }
} as const;

export function ReferralPanel({
  code,
  link,
  invited,
  started,
  paid,
  locale
}: ReferralPanelProps) {
  const t = translations[locale];
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const copy = async (value: string, what: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard blocked (old browser / no permission): the value stays
      // visible on screen, so the person can select it by hand.
    }
  };

  return (
    <div className="referral">
      <div className="referral__token">
        <span className="referral__label">{t.personal}</span>
        <strong className="referral__code">{code}</strong>
        <button
          className="button button--secondary"
          onClick={() => copy(code, "code")}
          type="button"
        >
          {copied === "code" ? t.copied : t.copyCode}
        </button>
      </div>

      <div className="referral__linkbox">
        <span className="referral__label">{t.link}</span>
        <code className="referral__link">{link}</code>
        <button
          className="button"
          onClick={() => copy(link, "link")}
          type="button"
        >
          {copied === "link" ? t.copied : t.copyLink}
        </button>
      </div>

      <dl className="referral__stats">
        <div>
          <dt>{t.invited}</dt>
          <dd>{invited}</dd>
        </div>
        <div>
          <dt>{t.started}</dt>
          <dd>{started}</dd>
        </div>
        <div>
          <dt>{t.paid}</dt>
          <dd>{paid}</dd>
        </div>
      </dl>

      <p className="referral__note">
        {t.privacy}
      </p>
    </div>
  );
}
