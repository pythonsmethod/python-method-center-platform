import Link from "next/link";
import { EmergencyNotice } from "@/components/EmergencyNotice";

const steps = [
  {
    title: "1. Регистрация",
    text: "Создайте аккаунт с email и паролем. Один человек — один аккаунт и один непрерывный кейс."
  },
  {
    title: "2. Анкета",
    text: "Расскажите, для кого запрос, какая цель и что происходит сейчас. Анкета создаёт ваш кейс."
  },
  {
    title: "3. Документы",
    text: "Загрузите медицинские документы (выписки, заключения, анализы) в защищённое хранилище."
  },
  {
    title: "4. Изучение кейса",
    text: "Карен и команда изучают анкету и документы и связываются с вами по дальнейшим шагам."
  },
  {
    title: "5. Сопровождение",
    text: "После согласования вы выбираете тариф сопровождения (5 или 15 недель) и оплачиваете его."
  }
];

export default function HomePage() {
  return (
    <div className="page-shell">
      <section className="page-header">
        <p className="eyebrow">Python Method</p>
        <h1>Реабилитация без границ</h1>
        <p>
          Индивидуальное сопровождение восстановления и реабилитации по
          методологии Карен. Платформа помогает передать команде вашу ситуацию
          и медицинские документы и оставаться на связи на всём пути.
        </p>
      </section>

      <section className="panel-grid" aria-label="Как это работает">
        {steps.map((step) => (
          <div className="panel" key={step.title}>
            <span className="panel__label">Как это работает</span>
            <h2>{step.title}</h2>
            <p>{step.text}</p>
          </div>
        ))}
        <div className="panel">
          <span className="panel__label">Начать</span>
          <h2>Готовы начать?</h2>
          <p>
            Зарегистрируйтесь и заполните анкету — это занимает около 10 минут.
          </p>
          <div className="panel-actions">
            <Link className="button" href="/login">
              Войти или создать аккаунт
            </Link>
          </div>
        </div>
      </section>

      <EmergencyNotice />

      <section className="panel-grid" aria-label="Важные ограничения">
        <div className="panel">
          <span className="panel__label">Границы ответственности</span>
          <h2>Платформа не заменяет врача</h2>
          <p>
            Python Method не является медицинским учреждением, не ставит
            диагнозы, не назначает и не отменяет лечение. Сопровождение не
            заменяет наблюдение лечащего врача. Условия оказания услуг описаны
            в <Link href="/legal/offer">публичной оферте</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
