// Social links for the site footer. Fill in the href values as the
// channels are ready — entries with an empty href are not rendered.
export type SocialLink = {
  label: string;
  href: string;
};

const candidates: SocialLink[] = [
  { label: "Instagram", href: "" },
  { label: "YouTube", href: "" },
  { label: "Telegram", href: "" },
  { label: "TikTok", href: "" },
  { label: "Facebook", href: "" }
];

export const socialLinks: SocialLink[] = candidates.filter(
  (link) => link.href.trim().length > 0
);
