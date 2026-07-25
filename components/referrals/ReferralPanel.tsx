"use client";

import { useState } from "react";

type ReferralPanelProps = {
  code: string;
  link: string;
  invited: number;
  started: number;
  paid: number;
};

export function ReferralPanel({
  code,
  link,
  invited,
  started,
  paid
}: ReferralPanelProps) {
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
        <span className="referral__label">Ваш личный код</span>
        <strong className="referral__code">{code}</strong>
        <button
          className="button button--secondary"
          onClick={() => copy(code, "code")}
          type="button"
        >
          {copied === "code" ? "Скопировано ✓" : "Скопировать код"}
        </button>
      </div>

      <div className="referral__linkbox">
        <span className="referral__label">Ссылка для друга</span>
        <code className="referral__link">{link}</code>
        <button
          className="button"
          onClick={() => copy(link, "link")}
          type="button"
        >
          {copied === "link" ? "Скопировано ✓" : "Скопировать ссылку"}
        </button>
      </div>

      <dl className="referral__stats">
        <div>
          <dt>Перешли по ссылке и зарегистрировались</dt>
          <dd>{invited}</dd>
        </div>
        <div>
          <dt>Заполнили анкету</dt>
          <dd>{started}</dd>
        </div>
        <div>
          <dt>Начали сопровождение</dt>
          <dd>{paid}</dd>
        </div>
      </dl>

      <p className="referral__note">
        Мы не показываем, кто именно перешёл по вашей ссылке, — только общее
        количество. Личные данные приглашённых остаются приватными.
      </p>
    </div>
  );
}
