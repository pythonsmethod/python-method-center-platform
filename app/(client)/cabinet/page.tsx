import Link from "next/link";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { PageHeader } from "@/components/PageHeader";
import {
  IconAnkh,
  IconEyeOfHorus,
  IconLotus,
  IconPapyrus,
  IconWater
} from "@/components/icons/EgyptianIcons";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getClientCaseShell } from "@/lib/cases/queries";
import { getUploadedDocumentsForCase } from "@/lib/documents/queries";
import { getCaseMessages } from "@/lib/messages/queries";
import { formatDateTime } from "@/lib/i18n/format";
import { caseStatusLabel } from "@/lib/i18n/status-labels";

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

// The one thing to do next, computed from the person's real state. Never
// invented: an empty cabinet that says "all good" is worse than one that
// says plainly what is missing.
function nextStep(input: {
  hasCase: boolean;
  documents: number;
  status: string | null;
}): { title: string; text: string; action: string; href: string } {
  if (!input.hasCase) {
    return {
      title: "Заполните анкету",
      text: "Первый шаг: анкета создаёт ваш кейс. Занимает около 10 минут.",
      action: "Заполнить анкету",
      href: "/onboarding"
    };
  }

  if (input.documents === 0) {
    return {
      title: "Загрузите документы",
      text: "Анализы, выписки, заключения. Без них Professor Python не сможет разобрать вашу ситуацию.",
      action: "Загрузить документы",
      href: "/cabinet/documents"
    };
  }

  if (input.status === "active_support") {
    return {
      title: "Вы в сопровождении",
      text: "Пишите в чат обо всём, что происходит: команда рядом каждый день.",
      action: "Открыть переписку",
      href: "/cabinet/chat"
    };
  }

  return {
    title: "Кейс у команды",
    text: "Professor Python изучает ваши материалы. Ответ придёт в переписку.",
    action: "Открыть переписку",
    href: "/cabinet/chat"
  };
}

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

  const [documentResult, messagesResult] = clientCase
    ? await Promise.all([
        getUploadedDocumentsForCase(auth.userId, clientCase.id),
        getCaseMessages(clientCase.id)
      ])
    : [null, null];

  const documents =
    documentResult?.status === "ready" ? documentResult.documents : [];
  const messages = messagesResult?.messages ?? [];
  const lastFromTeam = [...messages]
    .reverse()
    .find((message) => message.sender_role !== "client");

  const step = nextStep({
    hasCase: Boolean(clientCase),
    documents: documents.length,
    status: clientCase?.status ?? null
  });

  return (
    <>
      {isOnboardingSubmitted(params?.onboarding) ? (
        <div className="cab-note">
          <strong>Анкета отправлена</strong>
          <span>Кейс создан. Следующий шаг — загрузить документы.</span>
        </div>
      ) : null}

      <div className="cab-grid">
        <article className="cab-card cab-card--wide cab-card--accent">
          <span className="cab-card__label">Сейчас важно</span>
          <h2>{step.title}</h2>
          <p>{step.text}</p>
          <Link className="button" href={step.href}>
            {step.action}
          </Link>
        </article>

        <article className="cab-card">
          <span className="cab-card__icon">
            <IconLotus />
          </span>
          <span className="cab-card__label">Ваш кейс</span>
          {clientCase ? (
            <>
              <h2>{caseStatusLabel(clientCase.status)}</h2>
              <p>
                Открыт {formatDateTime(clientCase.created_at)}
                {clientCase.case_number ? ` · № ${clientCase.case_number}` : ""}
              </p>
              <Link className="cab-card__more" href="/cabinet/account">
                Подробнее о кейсе →
              </Link>
            </>
          ) : (
            <>
              <h2>Кейса пока нет</h2>
              <p>Он появится сразу после анкеты.</p>
            </>
          )}
        </article>

        <article className="cab-card">
          <span className="cab-card__icon">
            <IconPapyrus />
          </span>
          <span className="cab-card__label">Мои документы</span>
          <h2 className="cab-card__number">{documents.length}</h2>
          <p>
            {documents.length === 0
              ? "Ещё ничего не загружено."
              : `Последний: ${formatDateTime(documents[0].created_at)}`}
          </p>
          <Link className="cab-card__more" href="/cabinet/documents">
            Открыть документы →
          </Link>
        </article>

        <article className="cab-card cab-card--ai">
          <span className="cab-card__icon">
            <IconEyeOfHorus />
          </span>
          <span className="cab-card__label">ИИ-помощник</span>
          <h2>Спросите что угодно</h2>
          <p>
            Он рядом круглосуточно: подскажет по кабинету, объяснит статус,
            поможет сформулировать вопрос для Professor Python.
          </p>
          <ul className="cab-card__hints">
            <li>«Что мне сделать дальше?»</li>
            <li>«На каком этапе мой кейс?»</li>
            <li>«Какие документы ещё нужны?»</li>
          </ul>
          <p className="cab-card__note">
            Кнопка «☥ Спросить» — внизу экрана, на любой странице.
          </p>
        </article>

        <article className="cab-card">
          <span className="cab-card__icon">
            <IconWater />
          </span>
          <span className="cab-card__label">Связь с центром</span>
          <h2>Professor Python и команда</h2>
          {lastFromTeam ? (
            <p className="cab-card__quote">
              {lastFromTeam.body
                ? `«${lastFromTeam.body.slice(0, 110)}${
                    lastFromTeam.body.length > 110 ? "…" : ""
                  }»`
                : "Голосовое сообщение"}
            </p>
          ) : (
            <p>Здесь идёт вся переписка по вашему кейсу.</p>
          )}
          <Link className="cab-card__more" href="/cabinet/chat">
            Открыть переписку →
          </Link>
        </article>

        <article className="cab-card">
          <span className="cab-card__icon">
            <IconAnkh />
          </span>
          <span className="cab-card__label">Быстрые действия</span>
          <ul className="cab-actions">
            <li>
              <Link href="/cabinet/documents">Загрузить анализ</Link>
            </li>
            <li>
              <Link href="/cabinet/chat">Написать команде</Link>
            </li>
            <li>
              <Link href="/cabinet/account">Оплаты и история</Link>
            </li>
            <li>
              <Link href="/payment">Тарифы сопровождения</Link>
            </li>
          </ul>
        </article>
      </div>
    </>
  );
}
