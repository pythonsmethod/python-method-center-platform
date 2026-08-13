import Link from "next/link";
import { cookies } from "next/headers";
import { PageHeader } from "@/components/PageHeader";
import { PENDING_EMAIL_COOKIE } from "@/lib/auth/pending-email";
import { findMailbox } from "@/lib/auth/mailbox";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { CheckEmailActions } from "./CheckEmailActions";

type CheckEmailPageProps = {
  searchParams?: Promise<{ message?: string | string[] }>;
};

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// The page a person sees between creating an account and getting into the
// cabinet. It is written for someone who is not sure what a browser tab
// is: one instruction per line, in the order they happen, and a button
// that opens their own mailbox so nothing has to be found by hand.
export default async function CheckEmailPage({
  searchParams
}: CheckEmailPageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const email = cookieStore.get(PENDING_EMAIL_COOKIE)?.value ?? null;
  const t = getDictionary(await getLocale()).checkEmail;
  const mailbox = email ? findMailbox(email) : null;
  const linkInvalid = readParam(params?.message) === "link-invalid";

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={email ? `${t.sentTo} ${email}` : t.sentToUnknown}
      />

      <section className="auth-layout auth-layout--single">
        <div className="auth-panel check-email">
          {linkInvalid ? (
            <p className="form-message form-message--error">{t.linkInvalid}</p>
          ) : null}

          <ol className="check-email__steps">
            <li>{t.step1}</li>
            <li>{t.step2}</li>
            <li>{t.step3}</li>
          </ol>

          {mailbox ? (
            <a
              className="button"
              href={mailbox.url}
              rel="noreferrer"
              target="_blank"
            >
              {t.openMailbox} {mailbox.label}
            </a>
          ) : null}

          <p className="check-email__note">{t.spamNote}</p>

          <CheckEmailActions
            email={email}
            labels={{
              resend: t.resend,
              resending: t.resending,
              askEmail: t.askEmail,
              emailLabel: t.emailLabel
            }}
          />

          <div className="check-email__links">
            {/* For the person who opened the letter on their phone and came
                back to the computer where they started. */}
            <Link href="/login">{t.alreadyConfirmed}</Link>
            <Link href="/login?mode=signup">{t.wrongAddress}</Link>
            <Link href="/support">{t.askTeam}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
