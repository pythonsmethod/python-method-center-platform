"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  addSupplement,
  getTimingAdvice,
  initialSupplementActionState,
  initialTimingAdviceState,
  removeSupplement,
  toggleIntake
} from "@/lib/supplements/actions";
import {
  buildTodaySchedule,
  countDue,
  intakeKey,
  type SupplementRow
} from "@/lib/supplements/schedule";
import type { IntakeRecord } from "@/lib/supplements/queries";

type SupplementsPanelProps = {
  supplements: SupplementRow[];
  intakes: IntakeRecord[];
  serverToday: string; // ISO date, server clock — corrected on mount
  serverNow: string; // "HH:MM", server clock — corrected on mount
};

function localClock(): { today: string; now: string } {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  return {
    today: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    now: `${pad(d.getHours())}:${pad(d.getMinutes())}`
  };
}

// The tracker lives by the person's own clock, not the server's: after
// mount the browser's local date and time take over, so "today" is the
// day the person is actually living.
export function SupplementsPanel({
  supplements,
  intakes,
  serverToday,
  serverNow
}: SupplementsPanelProps) {
  const [clock, setClock] = useState({ today: serverToday, now: serverNow });

  useEffect(() => {
    setClock(localClock());
    const timer = setInterval(() => setClock(localClock()), 60_000);

    return () => clearInterval(timer);
  }, []);

  const takenKeys = useMemo(
    () =>
      new Set(
        intakes
          .filter((intake) => intake.takenOn === clock.today)
          .map((intake) => intakeKey(intake.supplementId, intake.timeSlot))
      ),
    [intakes, clock.today]
  );

  const schedule = useMemo(
    () => buildTodaySchedule(supplements, takenKeys, clock.now),
    [supplements, takenKeys, clock.now]
  );
  const due = countDue(schedule);
  const takenCount = schedule.filter((slot) => slot.status === "taken").length;

  const [addState, addAction, addPending] = useActionState(
    addSupplement,
    initialSupplementActionState
  );
  const [, removeAction] = useActionState(
    removeSupplement,
    initialSupplementActionState
  );
  const [, toggleAction] = useActionState(
    toggleIntake,
    initialSupplementActionState
  );
  const [adviceState, adviceAction, advicePending] = useActionState(
    getTimingAdvice,
    initialTimingAdviceState
  );

  // Up to 8 slots a day; the form starts with one.
  const [timeFields, setTimeFields] = useState<string[]>(["08:00"]);

  return (
    <>
      {schedule.length > 0 ? (
        <section className="panel supplements-today" aria-label="Приём сегодня">
          <div className="supplements-today__head">
            <div>
              <span className="panel__label">Сегодня</span>
              <h2>
                {due > 0
                  ? `Пора принять: ${due}`
                  : takenCount === schedule.length
                    ? "Всё принято — отличный день"
                    : "Пока всё по расписанию"}
              </h2>
            </div>
            <span className="supplements-today__score">
              {takenCount} / {schedule.length}
            </span>
          </div>

          <ul className="supplements-checklist">
            {schedule.map((slot) => (
              <li key={intakeKey(slot.supplementId, slot.time)}>
                <form action={toggleAction}>
                  <input
                    name="supplement_id"
                    type="hidden"
                    value={slot.supplementId}
                  />
                  <input name="time_slot" type="hidden" value={slot.time} />
                  <input name="taken_on" type="hidden" value={clock.today} />
                  <button
                    className={`supplements-slot supplements-slot--${slot.status}`}
                    type="submit"
                  >
                    <span className="supplements-slot__check" aria-hidden="true">
                      {slot.status === "taken" ? "✓" : ""}
                    </span>
                    <span className="supplements-slot__body">
                      <strong>{slot.name}</strong>
                      {slot.dose ? <em>{slot.dose}</em> : null}
                    </span>
                    <span className="supplements-slot__time">{slot.time}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <p className="supplements-today__hint">
            Нажмите на строку, когда приняли, — отметка сохранится. Нажали по
            ошибке — нажмите ещё раз.
          </p>
        </section>
      ) : (
        <div className="cab-note">
          <strong>Расписания пока нет</strong>
          <span>
            Добавьте первую добавку ниже — и здесь появится ваш ежедневный
            чек-лист с напоминанием, что пора принять.
          </span>
        </div>
      )}

      {supplements.length > 0 ? (
        <section className="panel" aria-label="Совет по времени приёма">
          <span className="panel__label">ИИ-помощник</span>
          <h2>Удачно ли выбрано время?</h2>
          <p>
            ИИ смотрит только на <strong>время</strong> приёма вашего списка:
            что лучше утром, что вечером, что разнести между собой. Что
            принимать и в какой дозе — решаете вы со своим специалистом; ИИ
            в это не вмешивается.
          </p>
          <form action={adviceAction}>
            <button className="button button--secondary" disabled={advicePending} type="submit">
              {advicePending ? "Смотрю расписание…" : "Спросить про время приёма"}
            </button>
          </form>
          {adviceState.status === "success" && adviceState.advice ? (
            <div className="supplements-advice">
              {adviceState.advice.split("\n").map((line, index) =>
                line.trim() ? <p key={index}>{line}</p> : null
              )}
            </div>
          ) : null}
          {adviceState.status === "error" && adviceState.message ? (
            <p className="form-message form-message--error">
              {adviceState.message}
            </p>
          ) : null}
        </section>
      ) : null}

      {supplements.length > 0 ? (
        <section className="panel" aria-label="Мои добавки">
          <span className="panel__label">Мой список</span>
          <h2>Добавки и время приёма</h2>
          <ul className="supplements-list">
            {supplements.map((supplement) => (
              <li key={supplement.id}>
                <span className="supplements-list__body">
                  <strong>{supplement.name}</strong>
                  <em>
                    {supplement.times.join(" · ")}
                    {supplement.dose ? ` — ${supplement.dose}` : ""}
                  </em>
                  {supplement.notes ? <small>{supplement.notes}</small> : null}
                </span>
                <form action={removeAction}>
                  <input
                    name="supplement_id"
                    type="hidden"
                    value={supplement.id}
                  />
                  <button
                    aria-label={`Удалить «${supplement.name}»`}
                    className="metrics-entries__delete"
                    type="submit"
                  >
                    ✕
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel" aria-label="Добавить добавку">
        <span className="panel__label">Новая добавка</span>
        <h2>Добавить в расписание</h2>
        <p>
          Название, при желании дозировка — и время, когда вам удобно
          принимать. Каждое время станет отдельной строкой в чек-листе.
        </p>
        <form action={addAction} className="onboarding-form supplements-form">
          <div className="metrics-form__row">
            <label className="field">
              <span>Название</span>
              <input
                maxLength={120}
                name="name"
                placeholder="Магний"
                required
                type="text"
              />
            </label>
            <label className="field">
              <span>Дозировка (не обязательно)</span>
              <input
                maxLength={120}
                name="dose"
                placeholder="400 мг"
                type="text"
              />
            </label>
          </div>

          <div className="supplements-form__times">
            <span className="field-caption">Время приёма</span>
            {timeFields.map((time, index) => (
              <div className="supplements-form__time" key={index}>
                <input
                  name="times"
                  onChange={(event) =>
                    setTimeFields((fields) =>
                      fields.map((value, i) =>
                        i === index ? event.target.value : value
                      )
                    )
                  }
                  required
                  type="time"
                  value={time}
                />
                {timeFields.length > 1 ? (
                  <button
                    aria-label="Убрать это время"
                    className="metrics-entries__delete"
                    onClick={() =>
                      setTimeFields((fields) =>
                        fields.filter((_, i) => i !== index)
                      )
                    }
                    type="button"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            ))}
            {timeFields.length < 8 ? (
              <button
                className="supplements-form__add-time"
                onClick={() => setTimeFields((fields) => [...fields, "20:00"])}
                type="button"
              >
                + ещё время
              </button>
            ) : null}
          </div>

          <label className="field">
            <span>Заметка (не обязательно)</span>
            <input
              maxLength={300}
              name="notes"
              placeholder="После еды, запить водой"
              type="text"
            />
          </label>

          <button className="button" disabled={addPending} type="submit">
            {addPending ? "Сохраняю…" : "Добавить в расписание"}
          </button>
          {addState.message ? (
            <p
              className={`form-message form-message--${
                addState.status === "success" ? "success" : "error"
              }`}
            >
              {addState.message}
            </p>
          ) : null}
        </form>
      </section>
    </>
  );
}
