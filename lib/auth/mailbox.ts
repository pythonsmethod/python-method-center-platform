// "Откройте почту" is not an instruction a person who struggles with
// technology can follow: they have to know which mailbox is theirs, find
// the application, and get back here afterwards. The address they just
// typed already says which provider it is, so the page can offer one
// button that opens the right inbox.
//
// Pure and unit-tested: the mapping is the whole feature.

export type Mailbox = {
  // Shown on the button, in the reader's own words for their provider.
  label: string;
  url: string;
};

const PROVIDERS: Array<{ domains: string[]; label: string; url: string }> = [
  {
    domains: ["gmail.com", "googlemail.com"],
    label: "Gmail",
    url: "https://mail.google.com/mail/u/0/#search/python+method"
  },
  {
    domains: ["mail.ru", "bk.ru", "inbox.ru", "list.ru", "internet.ru"],
    label: "Mail.ru",
    url: "https://e.mail.ru"
  },
  {
    domains: ["yandex.ru", "yandex.com", "ya.ru", "yandex.by", "yandex.kz"],
    label: "Яндекс.Почту",
    url: "https://mail.yandex.ru"
  },
  {
    domains: ["icloud.com", "me.com", "mac.com"],
    label: "iCloud Почту",
    url: "https://www.icloud.com/mail"
  },
  {
    domains: ["outlook.com", "hotmail.com", "live.com", "msn.com"],
    label: "Outlook",
    url: "https://outlook.live.com/mail/0/"
  },
  {
    domains: ["rambler.ru", "lenta.ru", "autorambler.ru"],
    label: "Рамблер.Почту",
    url: "https://mail.rambler.ru"
  },
  {
    domains: ["proton.me", "protonmail.com", "pm.me"],
    label: "Proton Mail",
    url: "https://mail.proton.me"
  }
];

export function findMailbox(email: string): Mailbox | null {
  const domain = String(email ?? "")
    .trim()
    .toLowerCase()
    .split("@")[1];

  if (!domain) {
    return null;
  }

  const provider = PROVIDERS.find((candidate) =>
    candidate.domains.includes(domain)
  );

  // A corporate or unknown domain gets no button rather than a wrong one:
  // sending someone to the wrong website is worse than sending them to
  // their own habits.
  return provider ? { label: provider.label, url: provider.url } : null;
}
