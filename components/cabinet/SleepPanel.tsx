"use client";

import type { Dictionary } from "@/lib/i18n/dictionaries";

import { useActionState, useEffect, useState } from "react";
import {
  getSleepAdvice,
  importNights,
  removeNight,
  saveNight
} from "@/lib/sleep/actions";
import {
  initialSleepActionState,
  initialSleepAdviceState,
  initialSleepImportState
} from "@/lib/sleep/action-state";
import { formatDuration, summarize, type SleepEntry } from "@/lib/sleep/sleep";
import type { GuidanceEntry } from "@/lib/assistant/knowledge";
import type { Locale } from "@/lib/i18n/locale";
import { plural } from "@/lib/i18n/plural";

type SleepPanelProps = {
  labels: Dictionary["cabinet"]["sleep"];
  entries: SleepEntry[];
  guidance: GuidanceEntry[];
  locale: Locale;
  dateLocale: string;
  // The server's date, replaced by the browser's on mount: the night a
  // person is recording belongs to the day they are actually living.
  serverToday: string;
};

function localToday(): string {
  const date = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const QUALITY_VALUES = [1, 2, 3, 4, 5];

export function SleepPanel({
  labels: t,
  entries,
  guidance,
  locale,
  dateLocale,
  serverToday
}: SleepPanelProps) {
  const [today, setToday] = useState(serverToday);

  useEffect(() => {
    setToday(localToday());
  }, []);

  const [saveState, saveAction, savePending] = useActionState(
    saveNight,
    initialSleepActionState
  );
  const [, removeAction] = useActionState(removeNight, initialSleepActionState);
  const [importState, importAction, importPending] = useActionState(
    importNights,
    initialSleepImportState
  );
  const [adviceState, adviceAction, advicePending] = useActionState(
    getSleepAdvice,
    initialSleepAdviceState
  );

  const stats = summarize(entries);
  const units = { hour: t.unitHour, minute: t.unitMinute };

  const formatNight = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "long"
    });

  return (
    <>
      {entries.length > 0 ? (
        <section className="panel sleep-summary" aria-label={t.summaryAria}>
          <span className="panel__label">{t.summaryLabel}</span>
          <h2>{t.summaryTitle}</h2>

          <div className="sleep-stats">
            <div className="sleep-stat">
              <strong>{stats.nights}</strong>
              <span>{t.statNights}</span>
            </div>
            {stats.averageMinutes !== null ? (
              <div className="sleep-stat sleep-stat--wide">
                <strong>{formatDuration(stats.averageMinutes, units)}</strong>
                <span>{t.statAverage}</span>
              </div>
            ) : null}
            {stats.averageBedtime ? (
              <div className="sleep-stat">
                <strong>{stats.averageBedtime}</strong>
                <span>{t.statBedtime}</span>
              </div>
            ) : null}
            {stats.averageWake ? (
              <div className="sleep-stat">
                <strong>{stats.averageWake}</strong>
                <span>{t.statWake}</span>
              </div>
            ) : null}
            {stats.spreadMinutes !== null ? (
              <div className="sleep-stat">
                <strong>
                  ± {stats.spreadMinutes} {t.unitMinute}
                </strong>
                <span>{t.statSpread}</span>
              </div>
            ) : null}
            {stats.averageQuality !== null ? (
              <div className="sleep-stat">
                <strong>
                  {stats.averageQuality} {t.statQualitySuffix}
                </strong>
                <span>{t.statQuality}</span>
              </div>
            ) : null}
          </div>

          {stats.spreadMinutes !== null ? (
            <p className="sleep-summary__hint">{t.spreadHint}</p>
          ) : null}
        </section>
      ) : (
        <div className="cab-note">
          <strong>{t.emptyTitle}</strong>
          <span>{t.emptyText}</span>
        </div>
      )}

      <section className="panel" aria-label={t.addAria}>
        <span className="panel__label">{t.addLabel}</span>
        <h2>{t.addTitle}</h2>
        <p>{t.addText}</p>

        <form action={saveAction} className="onboarding-form sleep-form">
          <div className="sleep-form__row">
            <label className="field">
              <span>{t.fieldDate}</span>
              <input defaultValue={today} name="slept_on" required type="date" />
            </label>
            <label className="field">
              <span>{t.fieldBedtime}</span>
              <input defaultValue="23:00" name="bedtime" required type="time" />
            </label>
            <label className="field">
              <span>{t.fieldWake}</span>
              <input defaultValue="07:00" name="wake_time" required type="time" />
            </label>
          </div>

          <fieldset className="sleep-quality">
            <legend>{t.fieldQuality}</legend>
            <div className="sleep-quality__row">
              {QUALITY_VALUES.map((value) => (
                <label className="sleep-quality__option" key={value}>
                  <input
                    defaultChecked={value === 3}
                    name="quality"
                    type="radio"
                    value={value}
                  />
                  <span>{value}</span>
                </label>
              ))}
            </div>
            <small>{t.qualityHint}</small>
          </fieldset>

          <div className="sleep-form__row">
            <label className="field">
              <span>{t.fieldAwakenings}</span>
              <input max={50} min={0} name="awakenings" type="number" />
            </label>
            <label className="field field--grow">
              <span>{t.fieldNote}</span>
              <input
                maxLength={500}
                name="note"
                placeholder={t.notePlaceholder}
                type="text"
              />
            </label>
          </div>

          <button className="button" disabled={savePending} type="submit">
            {savePending ? t.saving : t.addCta}
          </button>
          {saveState.message ? (
            <p
              className={`form-message form-message--${
                saveState.status === "success" ? "success" : "error"
              }`}
            >
              {saveState.message}
            </p>
          ) : null}
        </form>
      </section>

      {entries.length > 0 ? (
        <section className="panel" aria-label={t.listAria}>
          <span className="panel__label">{t.listLabel}</span>
          <h2>{t.listTitle}</h2>
          <ul className="sleep-list">
            {entries.map((entry) => (
              <li key={entry.id}>
                <span className="sleep-list__body">
                  <strong>{formatNight(entry.sleptOn)}</strong>
                  <em>
                    {entry.bedtime && entry.wakeTime
                      ? `${entry.bedtime} — ${entry.wakeTime}`
                      : ""}
                    {entry.durationMinutes !== null
                      ? `${entry.bedtime && entry.wakeTime ? " · " : ""}${formatDuration(
                          entry.durationMinutes,
                          units
                        )}`
                      : ""}
                    {entry.quality !== null ? ` · ${entry.quality}/5` : ""}
                    {entry.awakenings !== null
                      ? ` · ${entry.awakenings} ${plural(entry.awakenings, t.awakeningsForms)}`
                      : ""}
                  </em>
                  {entry.note ? <small>{entry.note}</small> : null}
                  {entry.source !== "manual" ? (
                    <span className="sleep-list__source">
                      {entry.device ?? t.sourceImport}
                    </span>
                  ) : null}
                </span>
                <form action={removeAction}>
                  <input name="entry_id" type="hidden" value={entry.id} />
                  <button
                    aria-label={`${t.remove} — ${formatNight(entry.sleptOn)}`}
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

      <section className="panel" aria-label={t.devicesAria}>
        <span className="panel__label">{t.devicesLabel}</span>
        <h2>{t.devicesTitle}</h2>
        <p>{t.devicesText}</p>

        <form action={importAction} className="onboarding-form sleep-import">
          <label className="field">
            <span>{t.deviceField}</span>
            <input
              maxLength={80}
              name="device"
              placeholder={t.devicePlaceholder}
              type="text"
            />
          </label>
          <input accept=".csv,text/csv,text/plain" name="file" required type="file" />
          <button
            className="button button--secondary"
            disabled={importPending}
            type="submit"
          >
            {importPending ? t.importPending : t.importCta}
          </button>
        </form>

        {importState.message ? (
          <p
            className={`form-message form-message--${
              importState.status === "success" ? "success" : "error"
            }`}
          >
            {importState.message}
          </p>
        ) : null}

        {importState.recognized.length > 0 ? (
          <p className="sleep-import__recognized">
            {t.importRecognized} {importState.recognized.join(", ")}
          </p>
        ) : null}

        {importState.skipped.length > 0 ? (
          <div className="sleep-import__skipped">
            <strong>{t.importSkipped}</strong>
            <ul>
              {importState.skipped.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <small>{t.importSkippedHint}</small>
          </div>
        ) : null}

        <p className="sleep-devices__honest">{t.devicesHonest}</p>
      </section>

      {guidance.length > 0 ? (
        <section className="panel sleep-guidance" aria-label={t.guidanceAria}>
          <span className="panel__label">{t.guidanceLabel}</span>
          <h2>{t.guidanceTitle}</h2>
          {guidance.map((entry) => (
            <article className="sleep-guidance__entry" key={entry.id}>
              <h3>{entry.title}</h3>
              {entry.content.split("\n").map((line, index) =>
                line.trim() ? <p key={index}>{line}</p> : null
              )}
            </article>
          ))}
        </section>
      ) : null}

      {entries.length > 0 ? (
        <section className="panel" aria-label={t.adviceAria}>
          <span className="panel__label">{t.adviceLabel}</span>
          <h2>{t.adviceTitle}</h2>
          <p>{t.adviceText}</p>
          <form action={adviceAction}>
            <input name="locale" type="hidden" value={locale} />
            <button
              className="button button--secondary"
              disabled={advicePending}
              type="submit"
            >
              {advicePending ? t.advicePending : t.adviceCta}
            </button>
          </form>
          {adviceState.status === "success" && adviceState.advice ? (
            <div className="sleep-advice">
              {adviceState.advice.split("\n").map((line, index) =>
                line.trim() ? <p key={index}>{line}</p> : null
              )}
              <small>{t.adviceBoundary}</small>
            </div>
          ) : null}
          {adviceState.status === "error" && adviceState.message ? (
            <p className="form-message form-message--error">
              {adviceState.message}
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
