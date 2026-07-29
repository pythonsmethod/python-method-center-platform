import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { ReferralPanel } from "@/components/referrals/ReferralPanel";
import { TokenPanel } from "@/components/referrals/TokenPanel";
import { getRequiredUser } from "@/lib/auth/require-user";
import { referralLink } from "@/lib/referrals/code";
import { getReferralSummary } from "@/lib/referrals/queries";
import {
  MIN_REDEEM_TOKENS,
  TOKENS_PER_PAID_REFERRAL
} from "@/lib/tokens/config";
import { getTokenLedger } from "@/lib/tokens/queries";

export const dynamic = "force-dynamic";

// Everything about tokens and invitations on one page, reached from the
// coin in the cabinet header. Read once — and the cabinet itself stays
// about the person's own case, not about a bonus programme.
export default async function TokensPage() {
  const auth = await getRequiredUser("/cabinet/tokens");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Токены"
          title="Токены и приглашения"
          description="Для этого раздела требуется настроенная аутентификация."
        />
        <AuthSetupNotice title="Раздел требует настройки Supabase Auth" />
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
        eyebrow="Токены"
        title="Токены и приглашения"
        description="Здесь всё о токенах: как они появляются, сколько их у вас и как превратить их в скидку. Достаточно прочитать один раз."
      />

      <p className="back-link">
        <Link href="/cabinet">← Вернуться в кабинет</Link>
      </p>

      <section className="panel-grid" aria-label="Как это работает">
        <div className="panel">
          <span className="panel__label">Как это работает</span>
          <h2>Откуда берутся токены</h2>
          <p>
            Вы приглашаете человека по своей ссылке. Если он начинает
            сопровождение, вам начисляется {TOKENS_PER_PAID_REFERRAL} токенов.
            Не за регистрацию — именно за начатое сопровождение: так в
            программе нет места пустым аккаунтам.
          </p>
        </div>
        <div className="panel">
          <span className="panel__label">Что с ними делать</span>
          <h2>1 токен = 1 доллар скидки</h2>
          <p>
            Токены копятся и превращаются в скидку на любую покупку на
            платформе. Обменять можно от {MIN_REDEEM_TOKENS} токенов: платформа
            выдаст код, который вводится на странице оплаты. Срок действия
            кода — 60 дней, использовать его можно один раз.
          </p>
        </div>
      </section>

      <section className="documents-section" aria-label="Ваши токены">
        <div className="documents-layout">
          <div className="document-upload">
            <div>
              <span className="panel__label">Ваш баланс</span>
              <h2>Токены и обмен на скидку</h2>
            </div>
            <TokenPanel
              balance={tokens.balance}
              transactions={tokens.transactions}
            />
          </div>

          <div className="documents-list-panel">
            <div>
              <span className="panel__label">Рекомендация</span>
              <h2>Пригласить того, кому это нужно</h2>
              <p>
                Если наш путь вам подходит — поделитесь им с человеком, который
                сейчас ищет поддержку. По вашей ссылке он попадёт на платформу и
                увидит, что вы уже здесь: это снимает главный страх новичка.
              </p>
            </div>
            {referral.status === "ready" && referral.code ? (
              <ReferralPanel
                code={referral.code}
                invited={referral.invited}
                link={referralLink(referral.code)}
                paid={referral.paid}
                started={referral.started}
              />
            ) : (
              <p className="empty-state">
                Ваш код приглашения появится здесь после создания кейса.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
