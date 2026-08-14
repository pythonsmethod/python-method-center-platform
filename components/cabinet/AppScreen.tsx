import Link from "next/link";
import type { Locale } from "@/lib/i18n/locale";

type AppScreenProps = {
  locale: Locale;
  name?: string;
  screen: "today" | "case" | "dialog" | "anham";
};

export function AppScreen({ locale, name = "", screen }: AppScreenProps) {
  const ru = locale === "ru";

  if (screen === "case") {
    return (
      <section className="pm-screen" aria-labelledby="case-title">
        <div className="pm-screen__title"><div><span>{ru ? "Ваш путь" : "Your journey"}</span><h1 id="case-title">{ru ? "Мой случай" : "My case"}</h1></div><button aria-label={ru ? "Дополнительные действия" : "More actions"} className="pm-icon-button">•••</button></div>
        <div className="pm-journey">
          <div className="pm-journey__line" aria-hidden="true" />
          <div className="pm-step is-done"><b>✓</b><span>{ru ? "Анкета" : "Questionnaire"}</span></div>
          <div className="pm-step is-done"><b>✓</b><span>{ru ? "Материалы" : "Documents"}</span></div>
          <div className="pm-step is-current"><b>●</b><span>{ru ? "Рассмотрение" : "Review"}</span></div>
          <div className="pm-step"><b>○</b><span>{ru ? "Заключение" : "Conclusion"}</span></div>
          <article className="pm-journey__card"><small>{ru ? "Сейчас" : "Now"}</small><h2>{ru ? "Материалы у профессора" : "Your documents are with the professor"}</h2><p>{ru ? "Мы уведомим вас, когда появится ответ." : "We will notify you when there is an update."}</p><Link className="pm-gold-button" href="/cabinet/documents">{ru ? "Добавить документы" : "Add documents"}</Link></article>
        </div>
        <p className="pm-secure">⌾ {ru ? "Данные защищены" : "Your data is protected"}</p>
      </section>
    );
  }

  if (screen === "dialog" || screen === "anham") {
    const anham = screen === "anham";
    return (
      <section className="pm-screen pm-chat" aria-labelledby={`${screen}-title`}>
        <div className="pm-chat__head"><Link aria-label={ru ? "Назад" : "Back"} href="/cabinet">←</Link><div><h1 id={`${screen}-title`}>{anham ? "Anham" : "Professor Python"}</h1><span>{anham ? (ru ? "ИИ-помощник · всегда рядом" : "AI assistant · always nearby") : (ru ? "Личный диалог" : "Private dialogue")}</span></div><span className="pm-chat__avatar">{anham ? "✣" : "P"}</span></div>
        <div className="pm-chat__messages">
          <div className="pm-bubble is-incoming">{anham ? (ru ? "Я рядом. Помочь подготовить вопрос профессору или объяснить следующий шаг?" : "I am here. Would you like help preparing a question for the professor or understanding the next step?") : (ru ? "Добрый день. Материалы получены, я внимательно их изучаю." : "Good day. I have received your documents and am reviewing them carefully.")}<time>20:30</time></div>
          <div className="pm-bubble is-outgoing">{anham ? (ru ? "Что сейчас происходит с моим случаем?" : "What is happening with my case now?") : (ru ? "Спасибо. Сообщите, если потребуется что-то ещё." : "Thank you. Please let me know if anything else is needed.")}<time>20:31 ✓</time></div>
          <div className="pm-bubble is-incoming">{anham ? (ru ? "Материалы уже переданы профессору. Сейчас от вас ничего не требуется — я сообщу, когда появится ответ." : "Your documents have been sent to the professor. Nothing is required from you now — I will let you know when there is an update.") : (ru ? "Обязательно. Я напишу вам, когда завершу рассмотрение." : "Of course. I will message you when the review is complete.")}<time>20:32</time></div>
        </div>
        {anham ? <div className="pm-quick-actions"><Link href="/cabinet/case">{ru ? "Показать мой путь" : "Show my journey"}</Link><Link href="/cabinet/documents">{ru ? "Добавить документ" : "Add a document"}</Link></div> : <p className="pm-secure">⌾ {ru ? "Диалог защищён" : "This dialogue is protected"}</p>}
        <Link className="pm-message-box" href={anham ? "/cabinet/chat#anham" : "/cabinet/chat"}><span>{ru ? "Напишите сообщение" : "Write a message"}</span><b>↑</b></Link>
      </section>
    );
  }

  return (
    <section className="pm-screen" aria-labelledby="today-title">
      <div className="pm-screen__title"><div><span>{ru ? "Anham · сводка" : "Anham · summary"}</span><h1 id="today-title">{ru ? `Добрый день${name ? `, ${name}` : ""}` : `Good day${name ? `, ${name}` : ""}`}</h1></div><span className="pm-icon-button">♧</span></div>
      <article className="pm-orbit-card"><div className="pm-orbit-card__rings" aria-hidden="true"><span>✣</span></div><small>{ru ? "Сегодня" : "Today"}</small><h2>{ru ? "Всё спокойно" : "Everything is on track"}</h2><p>{ru ? "Материалы у профессора. От вас сейчас ничего не требуется." : "Your documents are with the professor. Nothing is required from you right now."}</p><div className="pm-dots"><b /><i /><i /></div></article>
      <h2 className="pm-section-heading">{ru ? "Мои трекеры" : "My trackers"}</h2>
      <div className="pm-trackers">
        <Link href="/cabinet/metrics"><span className="pm-tracker__icon">↗</span><span><strong>{ru ? "Динамика показателей" : "Health trends"}</strong><small>{ru ? "Мои значения и изменения" : "My values and changes"}</small><em>{ru ? "Обновлено сегодня" : "Updated today"}</em></span><b>›</b></Link>
        <Link href="/cabinet/supplements"><span className="pm-tracker__icon">◒</span><span><strong>{ru ? "Мои добавки" : "My supplements"}</strong><small>{ru ? "Чек-лист приёма" : "Daily checklist"}</small><em>{ru ? "Посмотреть расписание" : "View schedule"}</em></span><b>›</b></Link>
        <Link href="/cabinet/sleep"><span className="pm-tracker__icon">☾</span><span><strong>{ru ? "Мой сон" : "My sleep"}</strong><small>{ru ? "Дневник сна и самочувствия" : "Sleep and wellbeing diary"}</small><em>{ru ? "Добавить запись" : "Add an entry"}</em></span><b>›</b></Link>
      </div>
    </section>
  );
}
