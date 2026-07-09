import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { LogoutButton } from "@/components/LogoutButton";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";

export default async function AdminPage() {
  const auth = await getRequiredStaffUser("/admin");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Рабочее место команды"
          title="Админ-панель"
          description="Для доступа требуется настроенная аутентификация."
        />

        <AuthSetupNotice title="Админ-панель требует настройки Supabase Auth" />
      </div>
    );
  }

  if (auth.status === "forbidden") {
    notFound();
  }

  if (auth.status === "error") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Рабочее место команды"
          title="Админ-панель"
          description="Не удалось проверить доступ."
        />

        <div className="notice notice--warning">
          <span className="panel__label">Ошибка доступа</span>
          <h2>Админ-панель недоступна</h2>
          <p>{auth.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Рабочее место команды"
        title="Админ-панель"
        description="Кейсы клиентов, загруженные документы и обращения."
      />

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">Сессия</span>
          <h2>{auth.email ?? "Сотрудник"}</h2>
          <p>Роль: {auth.role}</p>
          <div className="panel-actions">
            <LogoutButton />
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">Кейсы</span>
          <h2>Кейсы клиентов</h2>
          <p>
            Список кейсов с анкетами онбординга, контактами клиента и
            документами.
          </p>
          <div className="panel-actions">
            <Link className="button button--secondary" href="/admin/cases">
              Открыть кейсы
            </Link>
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">Документы</span>
          <h2>Входящие документы</h2>
          <p>
            Список всех загруженных документов с открытием файла по защищённой
            ссылке.
          </p>
          <div className="panel-actions">
            <Link className="button button--secondary" href="/admin/documents">
              Открыть документы
            </Link>
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">Обращения</span>
          <h2>Сообщения клиентов</h2>
          <p>
            Обращения из кабинета: вопрос, контакты клиента и управление
            статусом.
          </p>
          <div className="panel-actions">
            <Link className="button button--secondary" href="/admin/requests">
              Открыть обращения
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
