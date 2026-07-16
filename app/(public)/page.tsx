import Image from "next/image";
import Link from "next/link";
import { EmergencyNotice } from "@/components/EmergencyNotice";
import {
  IconAnkh,
  IconEye,
  IconFeather,
  IconLotus,
  IconPyramid,
  IconScarab,
  IconScroll,
  IconSun
} from "@/components/icons";

const heroPoints = [
  { icon: IconScarab, text: "Экспертное сопровождение под руководством Карена" },
  { icon: IconAnkh, text: "Индивидуальный подход без шаблонов и протоколов" },
  { icon: IconSun, text: "Платформа доступна 24/7 на каждом этапе" }
];

const cabinets = [
  {
    icon: IconAnkh,
    title: "Знакомство",
    text: "Узнайте о центре и наших принципах."
  },
  {
    icon: IconEye,
    title: "Вопросы и доверие",
    text: "Ответы на вопросы: оплата, условия, безопасность."
  },
  {
    icon: IconLotus,
    title: "Профилактика",
    text: "Программы профилактики и поддержка."
  },
  {
    icon: IconScarab,
    title: "Индивидуальный путь",
    text: "Глубокий разбор и персональная стратегия."
  },
  {
    icon: IconSun,
    title: "Формула",
    text: "Формула и инструкции по сопровождению."
  },
  {
    icon: IconScroll,
    title: "Анализы",
    text: "Сбор, проверка и анализ ваших данных."
  },
  {
    icon: IconFeather,
    title: "Дневник состояния",
    text: "Отслеживание изменений и динамики."
  },
  {
    icon: IconPyramid,
    title: "Материалы",
    text: "Рекомендации, образ жизни и поддержка."
  }
];

const whyCards = [
  {
    icon: IconEye,
    title: "Индивидуальный подход",
    text: "Нет шаблонов. Только ваша уникальная стратегия."
  },
  {
    icon: IconScarab,
    title: "Экспертное сопровождение",
    text: "Карен лично ведёт сложные случаи и корректирует путь."
  },
  {
    icon: IconLotus,
    title: "Целостный подход",
    text: "Работаем с причиной, а не только с симптомами."
  },
  {
    icon: IconPyramid,
    title: "Поддержка на каждом этапе",
    text: "Вы не останетесь один — платформа и команда на связи."
  },
  {
    icon: IconSun,
    title: "Ваш результат — наша цель",
    text: "Мы идём вместе с вами к устойчивому состоянию."
  }
];

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
      <section className="hero">
        <div className="hero__content">
          <p className="eyebrow">Цифровой реабилитационный центр</p>
          <h1>Python Method Center</h1>
          <p className="hero__subtitle">
            Индивидуальный путь к восстановлению, здоровью и новой жизни.
          </p>
          <ul className="hero__points">
            {heroPoints.map((point) => {
              const Icon = point.icon;

              return (
                <li key={point.text}>
                  <Icon size={22} />
                  <span>{point.text}</span>
                </li>
              );
            })}
          </ul>
          <div className="hero__cta">
            <Link className="button" href="/login">
              Начать путь
            </Link>
          </div>
        </div>
        <div className="hero__photo">
          <Image
            alt="Карен — основатель Python Method Center"
            height={1200}
            priority
            src="/images/karen-hero.jpg"
            width={525}
          />
        </div>
      </section>

      <p className="tagline">
        Мы ведём. Вы восстанавливаетесь. Вместе — к результату.
      </p>

      <section className="parchment" aria-label="Кабинеты центра">
        <p className="ornament">☥ ☥ ☥</p>
        <h2 className="section-title">Кабинеты центра</h2>
        <div className="pcard-grid">
          {cabinets.map((cabinet) => {
            const Icon = cabinet.icon;

            return (
              <div className="pcard" key={cabinet.title}>
                <Icon />
                <h3>{cabinet.title}</h3>
                <p>{cabinet.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-label="Почему с нами">
        <p className="ornament">☥ ☥ ☥</p>
        <h2 className="section-title">Почему с нами?</h2>
        <div className="why-grid">
          {whyCards.map((card) => {
            const Icon = card.icon;

            return (
              <div className="why-card" key={card.title}>
                <Icon />
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-label="Как это работает">
        <p className="ornament">☥ ☥ ☥</p>
        <h2 className="section-title">Как это работает</h2>
        <div className="panel-grid" style={{ marginTop: 26 }}>
          {steps.map((step) => (
            <div className="panel" key={step.title}>
              <span className="panel__label">Шаг за шагом</span>
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </div>
          ))}
          <div className="panel">
            <span className="panel__label">Начать</span>
            <h2>Готовы начать?</h2>
            <p>
              Зарегистрируйтесь и заполните анкету — это занимает около 10
              минут.
            </p>
            <div className="panel-actions">
              <Link className="button" href="/login">
                Начать путь
              </Link>
            </div>
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

      <p className="quote-strip">
        «Исцеление — это не мгновение, это путь. Мы идём его вместе.»
      </p>
    </div>
  );
}
