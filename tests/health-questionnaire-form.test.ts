import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { questionnaireCopy } from "@/lib/health/copy";
import { readQuestionnaire, REQUIRED_FIELDS } from "@/lib/health/questionnaire";

// The form and the reader have to agree on the name of every field.
//
// They are in different files and nothing in the type system connects an
// input's `name` attribute to the key the server reads. Rename one and the
// answer is simply dropped: the form saves, the person is told it saved,
// and the field comes back empty next time. That is the failure this file
// exists to catch, so it compares the two lists directly.

const formSource = readFileSync(
  join(process.cwd(), "components/cabinet/HealthQuestionnaireForm.tsx"),
  "utf8"
);

function fieldNamesInForm(): string[] {
  return [...formSource.matchAll(/name="([a-z_]+)"/g)].map((match) => match[1]).sort();
}

function fieldNamesRead(): string[] {
  const result = readQuestionnaire(new FormData());

  // An empty form still produces the full shape, so the keys are the
  // reader's own list of what it looks for.
  expect(result.status).toBe("incomplete");

  const full = new FormData();
  full.set("birth_date", "1980-04-12");
  full.set("sex", "female");
  full.set("complaints", "x");
  full.set("self_description", "x");

  const filled = readQuestionnaire(full);

  return filled.status === "ok" ? Object.keys(filled.version).sort() : [];
}

describe("форма и чтение анкеты не расходятся", () => {
  it("каждое поле формы читается сервером, и наоборот", () => {
    expect(fieldNamesInForm()).toEqual(fieldNamesRead());
  });

  it("обязательные поля отмечены в форме", () => {
    // A field the server refuses without and the form does not mark is a
    // person filling the whole thing in and being turned away at the end.
    for (const field of REQUIRED_FIELDS) {
      expect(formSource, field).toContain(`mark("${field}")`);
    }
  });
});

describe("анкета переведена целиком", () => {
  it("русская и английская версии описывают одни и те же поля", () => {
    // A half-translated questionnaire shows an English client a Russian
    // question, and a question somebody cannot read is answered badly.
    expect(Object.keys(questionnaireCopy.en).sort()).toEqual(
      Object.keys(questionnaireCopy.ru).sort()
    );

    for (const [key, value] of Object.entries(questionnaireCopy.en)) {
      expect(value, key).not.toBe(
        questionnaireCopy.ru[key as keyof typeof questionnaireCopy.ru]
      );
      expect(String(value).trim().length, key).toBeGreaterThan(0);
    }
  });
});
