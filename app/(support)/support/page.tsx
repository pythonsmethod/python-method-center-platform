import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { EmergencyNotice } from "@/components/EmergencyNotice";

export default function SupportPage() {
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Поддержка"
        title="Поддержка"
        description="Вопросы по платформе, документам и оплате."
      />

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">Как связаться</span>
          <h2>Напишите нам из кабинета</h2>
          <p>
            Форма «Написать команде» находится в{" "}
            <Link href="/cabinet">личном кабинете</Link>. Команда ответит по
            контактам, указанным в вашей анкете.
          </p>
        </div>
      </section>

      <EmergencyNotice />
    </div>
  );
}
