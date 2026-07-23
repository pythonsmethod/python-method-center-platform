import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RecoveryForm } from "./RecoveryForm";

type RecoveryPageProps = {
  searchParams?: Promise<{ message?: string | string[] }>;
};

export default async function RecoveryPage({ searchParams }: RecoveryPageProps) {
  const params = await searchParams;
  const message = Array.isArray(params?.message)
    ? params?.message[0]
    : params?.message;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Доступ к аккаунту"
        title="Забыли пароль?"
        description="Укажите email аккаунта — мы отправим письмо со ссылкой для смены пароля."
      />

      {message === "link-invalid" ? (
        <p className="form-message form-message--error">
          Ссылка для смены пароля недействительна или устарела (ссылку можно
          использовать только один раз). Запросите новую ниже.
        </p>
      ) : null}

      <section className="auth-layout">
        <div className="auth-panel">
          <RecoveryForm />
        </div>
        <div className="panel">
          <span className="panel__label">Как это работает</span>
          <h2>Три шага</h2>
          <p>
            1. Отправьте форму — письмо придёт в течение пары минут (проверьте
            «Спам»). 2. Откройте ссылку из письма. 3. Задайте новый пароль — и
            вы снова в кабинете.
          </p>
          <p>
            Вспомнили пароль? <Link href="/login">Войти</Link>. Ссылка не
            приходит — напишите нам через{" "}
            <Link href="/support">страницу поддержки</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
