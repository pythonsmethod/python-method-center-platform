"use client";

import { useActionState, useState } from "react";
import { saveQuestionnaire } from "@/lib/health/actions";
import {
  initialQuestionnaireActionState,
  type QuestionnaireActionState
} from "@/lib/health/action-state";
import type { QuestionnaireCopy } from "@/lib/health/copy";
import type { StoredVersion } from "@/lib/health/queries";

type HealthQuestionnaireFormProps = {
  current: StoredVersion | null;
  copy: QuestionnaireCopy;
};

// The form is prefilled from the newest version and saved as the next one.
//
// It is one form, not two: the questionnaire a person fills at the start
// and the one they correct two years later are the same set of questions,
// and keeping a separate "edit" screen is how the two drift apart.
export function HealthQuestionnaireForm({
  current,
  copy: t
}: HealthQuestionnaireFormProps) {
  const [state, formAction, pending] = useActionState<
    QuestionnaireActionState,
    FormData
  >(saveQuestionnaire, initialQuestionnaireActionState);

  // The women's questions appear once sex is answered, and only then. A man
  // is not asked about his cycle, and a person who has answered nothing yet
  // is not shown a question they cannot place.
  const [sex, setSex] = useState<string>(current?.sex ?? "");

  const missing = (field: string) => state.missing.includes(field as never);
  const mark = (field: string) =>
    missing(field) ? " hq__field--missing" : "";
  const required = <em className="hq__required"> — {t.requiredMark}</em>;

  return (
    <form action={formAction} className="hq-form">
      <fieldset className="hq__group">
        <legend>{t.aboutTitle}</legend>

        <div className="hq__row">
          <label className={`field${mark("birth_date")}`}>
            <span>{t.birthDate}{required}</span>
            <input
              aria-invalid={missing("birth_date") || undefined}
              defaultValue={current?.birth_date ?? ""}
              name="birth_date"
              type="date"
            />
            <small className="field__hint">{t.birthDateHint}</small>
          </label>

          <label className={`field${mark("sex")}`}>
            <span>{t.sex}{required}</span>
            <select
              aria-invalid={missing("sex") || undefined}
              name="sex"
              onChange={(event) => setSex(event.target.value)}
              value={sex}
            >
              <option value="">{t.sexPlaceholder}</option>
              <option value="female">{t.sexFemale}</option>
              <option value="male">{t.sexMale}</option>
              <option value="unspecified">{t.sexUnspecified}</option>
            </select>
          </label>
        </div>

        <div className="hq__row">
          <label className="field">
            <span>{t.height}</span>
            <input
              defaultValue={current?.height_cm ?? ""}
              inputMode="decimal"
              name="height_cm"
              type="text"
            />
          </label>

          <label className="field">
            <span>{t.weight}</span>
            <input
              defaultValue={current?.weight_kg ?? ""}
              inputMode="decimal"
              name="weight_kg"
              type="text"
            />
          </label>
        </div>
        <p className="hq__note">{t.measurementsHint}</p>
      </fieldset>

      <fieldset className="hq__group">
        <legend>{t.complaintsTitle}</legend>

        <label className={`field${mark("complaints")}`}>
          <span>{t.complaints}{required}</span>
          <textarea
            aria-invalid={missing("complaints") || undefined}
            defaultValue={current?.complaints ?? ""}
            name="complaints"
            placeholder={t.complaintsPlaceholder}
            rows={5}
          />
          <small className="field__hint">{t.complaintsHint}</small>
        </label>
      </fieldset>

      <fieldset className="hq__group">
        <legend>{t.historyTitle}</legend>

        <label className="field">
          <span>{t.chronic}</span>
          <textarea defaultValue={current?.chronic_conditions ?? ""} name="chronic_conditions" rows={4} />
          <small className="field__hint">{t.chronicHint}</small>
        </label>

        <label className="field">
          <span>{t.surgeries}</span>
          <textarea defaultValue={current?.surgeries ?? ""} name="surgeries" rows={3} />
          <small className="field__hint">{t.surgeriesHint}</small>
        </label>

        <label className="field">
          <span>{t.allergies}</span>
          <textarea defaultValue={current?.allergies ?? ""} name="allergies" rows={3} />
          <small className="field__hint">{t.allergiesHint}</small>
        </label>

        <label className="field">
          <span>{t.habits}</span>
          <textarea defaultValue={current?.habits ?? ""} name="habits" rows={3} />
          <small className="field__hint">{t.habitsHint}</small>
        </label>
      </fieldset>

      {sex === "female" ? (
        <fieldset className="hq__group">
          <legend>{t.womenTitle}</legend>
          <p className="hq__note">{t.womenNote}</p>

          <div className="hq__row">
            <label className="field">
              <span>{t.pregnancy}</span>
              <select defaultValue={current?.pregnancy_status ?? "no"} name="pregnancy_status">
                <option value="no">{t.pregnancyNo}</option>
                <option value="pregnant">{t.pregnancyPregnant}</option>
                <option value="breastfeeding">{t.pregnancyBreastfeeding}</option>
                <option value="planning">{t.pregnancyPlanning}</option>
              </select>
            </label>

            <label className="field">
              <span>{t.cycle}</span>
              <select defaultValue={current?.cycle_status ?? "regular"} name="cycle_status">
                <option value="regular">{t.cycleRegular}</option>
                <option value="irregular">{t.cycleIrregular}</option>
                <option value="absent">{t.cycleAbsent}</option>
                <option value="menopause">{t.cycleMenopause}</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span>{t.cycleNote}</span>
            <textarea defaultValue={current?.cycle_note ?? ""} name="cycle_note" rows={2} />
            <small className="field__hint">{t.cycleNoteHint}</small>
          </label>
        </fieldset>
      ) : null}

      <fieldset className="hq__group hq__group--own">
        <legend>{t.ownTitle}</legend>

        <label className={`field${mark("self_description")}`}>
          <span>{t.own}{required}</span>
          <textarea
            aria-invalid={missing("self_description") || undefined}
            defaultValue={current?.self_description ?? ""}
            name="self_description"
            placeholder={t.ownPlaceholder}
            rows={12}
          />
          <small className="field__hint">{t.ownHint}</small>
        </label>
      </fieldset>

      <div className="hq__actions">
        <button className="button" disabled={pending} type="submit">
          {pending ? t.submitting : t.submit}
        </button>
      </div>

      {state.message ? (
        <p
          aria-live="assertive"
          className={`form-message form-message--${state.status === "success" ? "success" : "error"}`}
          role={state.status === "success" ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
