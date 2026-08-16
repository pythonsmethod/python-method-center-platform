import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { ReferralPanel } from "@/components/referrals/ReferralPanel";
import { TokenPanel } from "@/components/referrals/TokenPanel";
import { getRequiredUser } from "@/lib/auth/require-user";
import { referralLink } from "@/lib/referrals/code";
import { getReferralSummary } from "@/lib/referrals/queries";
import { MIN_REDEEM_TOKENS, REFERRAL_SHARE } from "@/lib/tokens/config";
import { getTokenLedger } from "@/lib/tokens/queries";

export const dynamic = "force-dynamic";

// Everything about tokens and invitations on one page, reached from the
// coin in the cabinet header. Read once — and the cabinet itself stays
// about the person's own case, not about a bonus programme.
export default async function TokensPage() {
  const locale = await getLocale();
  const strings = getDictionary(locale);
  const t = strings.cabinet.tokens;
  const auth = await getRequiredUser("/cabinet/tokens");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow={t.eyebrow}
          title={t.title}
          description={t.setupDescription}
        />
        <AuthSetupNotice title={t.setupNotice} labels={strings.setup} />
      </div>
    );
  }

  const [referral, tokens] = await Promise.all([
    getReferralSummary(auth.userId),
    getTokenLedger(auth.userId)
  ]);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <section className="panel-grid" aria-label={t.howAria}>
        <div className="panel">
          <span className="panel__label">{t.howLabel}</span>
          <h2>{t.howTitle}</h2>
          <p>
            {t.howTextPrefix}
            {Math.round(REFERRAL_SHARE * 100)}
            {t.howTextSuffix}
          </p>
        </div>
        <div className="panel">
          <span className="panel__label">{t.useLabel}</span>
          <h2>{t.useTitle}</h2>
          <p>
            {t.useTextPrefix}
            {MIN_REDEEM_TOKENS}
            {t.useTextSuffix}
          </p>
        </div>
      </section>

      <section className="documents-section" aria-label={t.balanceAria}>
        <div className="documents-layout">
          <div className="document-upload">
            <div>
              <span className="panel__label">{t.balanceLabel}</span>
              <h2>{t.balanceTitle}</h2>
            </div>
            <TokenPanel
              balance={tokens.balance}
              locale={locale}
              transactions={tokens.transactions}
            />
          </div>

          <div className="documents-list-panel">
            <div>
              <span className="panel__label">{t.inviteLabel}</span>
              <h2>{t.inviteTitle}</h2>
              <p>
                {t.inviteText}
              </p>
            </div>
            {referral.status === "ready" && referral.code ? (
              <ReferralPanel
                code={referral.code}
                invited={referral.invited}
                link={referralLink(referral.code)}
                locale={locale}
                paid={referral.paid}
                started={referral.started}
              />
            ) : (
              <p className="empty-state">
                {t.codeSoon}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
