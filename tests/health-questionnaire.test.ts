import { describe, expect, it } from "vitest";
import {
  isPlausibleBirthDate,
  isSameAnswers,
  readQuestionnaire,
  REQUIRED_FIELDS,
  type QuestionnaireVersion
} from "@/lib/health/questionnaire";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();

  for (const [name, value] of Object.entries(fields)) {
    data.set(name, value);
  }

  return data;
}

const filled = {
  birth_date: "1980-04-12",
  sex: "female",
  complaints: "Быстро устаю к середине дня.",
  self_description: "Началось весной, после операции стало тяжелее."
};

describe("чтение анкеты", () => {
  it("принимает заполненную анкету целиком", () => {
    const result = readQuestionnaire(
      form({
        ...filled,
        height_cm: "168",
        weight_kg: "61,5",
        chronic_conditions: "Гипотиреоз с 2019",
        surgeries: "Аппендэктомия, 2004",
        allergies: "Пенициллин — крапивница",
        habits: "Не курю, алкоголь редко",
        pregnancy_status: "no",
        cycle_status: "irregular",
        cycle_note: "Задержки по две недели"
      })
    );

    expect(result.status).toBe("ok");

    if (result.status !== "ok") {
      return;
    }

    expect(result.version.height_cm).toBe(168);
    // A person types the decimal separator their keyboard gives them.
    expect(result.version.weight_kg).toBe(61.5);
    expect(result.version.cycle_status).toBe("irregular");
    expect(result.version.self_description).toContain("после операции");
  });

  it("называет все незаполненные обязательные поля разом", () => {
    // Not one at a time: a form that reveals its requirements one refusal
    // per attempt is a form people abandon.
    const result = readQuestionnaire(form({}));

    expect(result.status).toBe("incomplete");

    if (result.status !== "incomplete") {
      return;
    }

    expect(result.missing).toEqual([...REQUIRED_FIELDS]);
  });

  it("считает пустое поле из одних пробелов незаполненным", () => {
    const result = readQuestionnaire(form({ ...filled, complaints: "   \n  " }));

    expect(result.status).toBe("incomplete");

    if (result.status !== "incomplete") {
      return;
    }

    expect(result.missing).toEqual(["complaints"]);
  });

  it("сохраняет строки списка, но убирает лишние пробелы внутри строки", () => {
    // Somebody listing three operations on three lines meant three lines.
    const result = readQuestionnaire(
      form({ ...filled, surgeries: "Аппендэктомия,   2004\nХолецистэктомия, 2011" })
    );

    expect(result.status).toBe("ok");

    if (result.status !== "ok") {
      return;
    }

    expect(result.version.surgeries).toBe(
      "Аппендэктомия, 2004\nХолецистэктомия, 2011"
    );
  });
});

describe("отказ вместо молчаливого исправления", () => {
  it("не принимает дату рождения из будущего или из позапрошлого века", () => {
    const today = new Date("2026-09-01T00:00:00Z");

    expect(isPlausibleBirthDate("1980-04-12", today)).toBe(true);
    expect(isPlausibleBirthDate("2027-01-01", today)).toBe(false);
    expect(isPlausibleBirthDate("1850-01-01", today)).toBe(false);
    expect(isPlausibleBirthDate("12.04.1980", today)).toBe(false);
  });

  it("возвращает поле, в котором ошибка, а не общий отказ", () => {
    // The person has to know which line to look at.
    const height = readQuestionnaire(form({ ...filled, height_cm: "1.7" }));
    const weight = readQuestionnaire(form({ ...filled, weight_kg: "610" }));

    expect(height).toEqual({ status: "invalid", field: "height_cm" });
    expect(weight).toEqual({ status: "invalid", field: "weight_kg" });
  });

  it("не выдумывает пол из неизвестного значения", () => {
    const result = readQuestionnaire(form({ ...filled, sex: "что-то" }));

    expect(result.status).toBe("incomplete");
  });
});

describe("вопросы, которые задаются не всем", () => {
  it("мужчине цикл и беременность записываются как неприменимые", () => {
    // Not left blank: a blank is later read as "не ответил", and that is a
    // different thing from "не спрашивали".
    const result = readQuestionnaire(
      form({
        ...filled,
        sex: "male",
        pregnancy_status: "pregnant",
        cycle_status: "regular",
        cycle_note: "что-то"
      })
    );

    expect(result.status).toBe("ok");

    if (result.status !== "ok") {
      return;
    }

    expect(result.version.pregnancy_status).toBe("not_applicable");
    expect(result.version.cycle_status).toBe("not_applicable");
    expect(result.version.cycle_note).toBeNull();
  });
});

describe("новая версия против прежней", () => {
  const base: QuestionnaireVersion = {
    birth_date: "1980-04-12",
    sex: "female",
    height_cm: 168,
    weight_kg: 61.5,
    complaints: "Устаю",
    chronic_conditions: null,
    surgeries: null,
    allergies: null,
    habits: null,
    pregnancy_status: "no",
    cycle_status: "regular",
    cycle_note: null,
    self_description: "Началось весной"
  };

  it("открыть анкету и сохранить её нетронутой — не изменение", () => {
    // Otherwise today's date lands on an answer given months ago, and the
    // history is read for exactly that: when something changed.
    expect(isSameAnswers({ ...base }, base)).toBe(true);
  });

  it("любое расхождение делает её новой версией", () => {
    expect(isSameAnswers({ ...base, weight_kg: 62 }, base)).toBe(false);
    expect(isSameAnswers({ ...base, complaints: "Устаю сильнее" }, base)).toBe(false);
    expect(isSameAnswers({ ...base, allergies: "Пенициллин" }, base)).toBe(false);
  });

  it("первая анкета всегда новая", () => {
    expect(isSameAnswers(base, null)).toBe(false);
  });
});
