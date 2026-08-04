import Link from "next/link";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { CaseMessageThread } from "@/components/messages/CaseMessageThread";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getClientCaseShell } from "@/lib/cases/queries";
import { getUploadedDocumentsForCase } from "@/lib/documents/queries";
import { getCaseMessages } from "@/lib/messages/queries";
import { getSupplementsDueCount } from "@/lib/supplements/queries";

export const dynamic = "force-dynamic";

type CabinetPageProps = {
  searchParams?: Promise<{
    onboarding?: string | string[];
  }>;
};

function isOnboardingSubmitted(value: string | string[] | undefined): boolean {
  return Array.isArray(value)
    ? value.includes("submitted")
    : value === "submitted";
}

// The home page of the cabinet is the conversation with Professor Python,
// because that is what a person comes here to do. Everything else — the
// case, the payments, the documents — lives one tap away in the column on
// the left and does not compete with it.
export default async function CabinetPage({ searchParams }: CabinetPageProps) {
  const auth = await getRequiredUser("/cabinet");
  const params = await searchParams;

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Личный кабинет"
          title="Кабинет"
          description="Для кабинета требуется настроенная аутентификация."
        />
        <AuthSetupNotice title="Кабинет требует настройки Supabase Auth" />
      </div>
    );
  }

  const caseResult = await getClientCaseShell(auth.userId);
  const clientCase =
    caseResult.status === "ready" && caseResult.case ? caseResult.case : null;

  const supplementsDue = await getSupplementsDueCount();

  const [documentResult, messagesResult] = clientCase
    ? await Promise.all([
        getUploadedDocumentsForCase(auth.userId, clientCase.id),
        getCaseMessages(clientCase.id)
      ])
    : [null, null];

  const documents =
    documentResult?.status === "ready" ? documentResult.documents : [];

  if (!clientCase) {
    return (
      <div className="cab-start">
        <span className="cab-card__label">Первый шаг</span>
        <h2>Заполните анкету</h2>
        <p>
          Анкета создаёт ваш кейс — и сразу после неё здесь откроется
          переписка с Professor Python. Занимает около десяти минут.
        </p>
        <Link className="button" href="/onboarding">
          Заполнить анкету
        </Link>
      </div>
    );
  }

  return (
    <>
      {isOnboardingSubmitted(params?.onboarding) ? (
        <div className="cab-note">
          <strong>Анкета отправлена</strong>
          <span>Кейс создан. Напишите здесь — команда центра рядом.</span>
        </div>
      ) : null}

      {supplementsDue > 0 ? (
        <div className="cab-note cab-note--reminder">
          <strong>Напоминание о приёме</strong>
          <span>
            По вашему расписанию пора принять: {supplementsDue}.{" "}
            <Link href="/cabinet/supplements">Открыть чек-лист</Link>
          </span>
        </div>
      ) : null}

      {documents.length === 0 ? (
        <div className="cab-note">
          <strong>Загрузите документы</strong>
          <span>
            Анализы, выписки и заключения. Без них Professor Python не сможет
            разобрать вашу ситуацию.{" "}
            <Link href="/cabinet/documents">Загрузить</Link>
          </span>
        </div>
      ) : null}

      <section className="cab-thread" aria-label="Переписка с центром">
        <div className="cab-thread__head">
          <span className="panel__label">Ваша переписка</span>
          <h1>Professor Python и команда</h1>
        </div>
        <CaseMessageThread
            labels={getDictionary(await getLocale()).cabinet.thread}
          caseId={clientCase.id}
          expandable
          loadError={messagesResult?.error ?? null}
          messages={messagesResult?.messages ?? []}
          viewer="client"
        />
      </section>
    </>
  );
}
