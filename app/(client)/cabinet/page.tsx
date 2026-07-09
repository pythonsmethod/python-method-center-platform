import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { EmergencyNotice } from "@/components/EmergencyNotice";
import { LogoutButton } from "@/components/LogoutButton";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getClientCaseShell } from "@/lib/cases/queries";
import { getUploadedDocumentsForCase } from "@/lib/documents/queries";
import {
  caseDirectionLabel,
  caseStatusLabel,
  caseUrgencyLabel,
  supportStatusLabel
} from "@/lib/i18n/status-labels";
import { getOwnSupportRequests } from "@/lib/support/queries";
import { DocumentUploadPanel } from "./DocumentUploadPanel";
import { SupportRequestForm } from "./SupportRequestForm";

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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
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
  const submitted = isOnboardingSubmitted(params?.onboarding);
  const documentResult =
    caseResult.status === "ready" && caseResult.case
      ? await getUploadedDocumentsForCase(auth.userId, caseResult.case.id)
      : null;
  const supportResult = await getOwnSupportRequests(auth.userId);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Личный кабинет"
        title="Кабинет"
        description="Ваш кейс, медицинские документы и связь с командой."
      />

      {submitted ? (
        <div className="notice notice--success">
          <span className="panel__label">Анкета отправлена</span>
          <h2>Кейс создан</h2>
          <p>
            Анкета сохранена и привязана к вашему кейсу. Загрузите медицинские
            документы ниже — команда изучит кейс и свяжется с вами.
          </p>
        </div>
      ) : null}

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">Ваш аккаунт</span>
          <h2>{auth.email ?? "Вы вошли в систему"}</h2>
          <p>
            Один аккаунт — один непрерывный кейс. Все документы и сообщения
            привязаны к нему.
          </p>
          <div className="panel-actions">
            <LogoutButton />
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">Ваш кейс</span>
          {caseResult.status === "error" ? (
            <>
              <h2>Статус кейса недоступен</h2>
              <p>{caseResult.message}</p>
            </>
          ) : caseResult.case ? (
            <>
              <h2>{caseStatusLabel(caseResult.case.status)}</h2>
              <ul className="status-list">
                <li>Цель: {caseResult.case.title ?? "Не указана"}</li>
                <li>
                  Срочность: {caseUrgencyLabel(caseResult.case.urgency)}
                </li>
                <li>
                  Направление:{" "}
                  {caseDirectionLabel(caseResult.case.direction)}
                </li>
                <li>Создан: {formatDate(caseResult.case.created_at)}</li>
              </ul>
            </>
          ) : (
            <>
              <h2>Кейса пока нет</h2>
              <p>
                Заполните анкету, чтобы создать кейс — после этого можно будет
                загрузить документы.
              </p>
              <div className="panel-actions">
                <Link className="button" href="/onboarding">
                  Заполнить анкету
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {caseResult.status === "ready" && caseResult.case ? (
        documentResult?.status === "ready" ? (
          <DocumentUploadPanel
            caseId={caseResult.case.id}
            initialDocuments={documentResult.documents}
            userId={auth.userId}
          />
        ) : (
          <div className="notice notice--warning">
            <span className="panel__label">Документы</span>
            <h2>Документы недоступны</h2>
            <p>
              {documentResult?.status === "error"
                ? documentResult.message
                : "Для загрузки документов нужен активный кейс."}
            </p>
          </div>
        )
      ) : null}

      <section className="documents-section" aria-label="Связь с командой">
        <div className="documents-layout">
          <div className="document-upload">
            <div>
              <span className="panel__label">Связь с командой</span>
              <h2>Написать команде</h2>
            </div>
            <SupportRequestForm />
          </div>

          <div className="documents-list-panel">
            <div>
              <span className="panel__label">Ваши обращения</span>
              <h2>История сообщений</h2>
            </div>

            {supportResult.status === "error" ? (
              <p className="empty-state">{supportResult.message}</p>
            ) : supportResult.requests.length === 0 ? (
              <p className="empty-state">
                Обращений пока нет. Напишите нам, если есть вопрос.
              </p>
            ) : (
              <ul className="document-list">
                {supportResult.requests.map((request) => (
                  <li className="document-list__item" key={request.id}>
                    <div>
                      <strong>{request.subject}</strong>
                      <span>{formatDate(request.created_at)}</span>
                      <span className="status-badge">
                        {supportStatusLabel(request.status)}
                      </span>
                    </div>
                    {request.body ? <p>{request.body}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <EmergencyNotice />
    </div>
  );
}
