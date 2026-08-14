import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SLEEP_ADVICE_SYSTEM_PROMPT } from "@/lib/sleep/prompt";
import { detectRedFlagInMessage } from "@/lib/assistant/red-flags";
import { getDictionary } from "@/lib/i18n/dictionaries";

// The sleep tracker is the tool most likely to pull the platform over its
// own line. Every second article about sleep names a disorder and
// prescribes something for it, and a person who has just written "I stop
// breathing at night" into a diary field is one sentence away from being
// told what they have.
//
// These hold the three boundaries that keep the tool honest: the assistant
// does not diagnose or prescribe, the promise about devices matches what
// the code can actually do, and a person describing an emergency is sent to
// a doctor rather than filed away.

describe("what the assistant is forbidden to do with sleep", () => {
  it("is told not to diagnose — including by hinting", () => {
    expect(SLEEP_ADVICE_SYSTEM_PROMPT).toContain("НИКОГДА не ставь диагнозов");
    // Naming the condition is the diagnosis, however it is hedged.
    expect(SLEEP_ADVICE_SYSTEM_PROMPT).toContain("апноэ");
    expect(SLEEP_ADVICE_SYSTEM_PROMPT).toContain("похоже на");
  });

  it("is told not to prescribe anything, sleeping pills included", () => {
    expect(SLEEP_ADVICE_SYSTEM_PROMPT).toContain("НИКОГДА не назначай лечение");
    expect(SLEEP_ADVICE_SYSTEM_PROMPT).toContain("снотворных");
  });

  it("is told to work only from what the person actually recorded", () => {
    expect(SLEEP_ADVICE_SYSTEM_PROMPT).toContain("Опирайся ТОЛЬКО на переданные записи");
    expect(SLEEP_ADVICE_SYSTEM_PROMPT).toContain("по одной-двум ночам выводов не делают");
  });

  it("is told to route the frightening things to a doctor", () => {
    expect(SLEEP_ADVICE_SYSTEM_PROMPT).toContain("остановки дыхания");
    expect(SLEEP_ADVICE_SYSTEM_PROMPT).toContain("нужно к врачу");
    expect(SLEEP_ADVICE_SYSTEM_PROMPT).toContain("Без диагноза");
  });

  it("promises no result", () => {
    expect(SLEEP_ADVICE_SYSTEM_PROMPT).toContain("Не обещай результат");
  });
});

describe("a note that is not about sleep at all", () => {
  it("is recognised by the same screen the chat uses", () => {
    // The note field is free text. Someone will write the thing they are
    // frightened of into it, and a diary must not swallow that sentence.
    expect(detectRedFlagInMessage("под утро задыхаюсь, страшно")).toBe("physical");
    expect(detectRedFlagInMessage("боль в груди ночью")).toBe("physical");
    expect(detectRedFlagInMessage("душно, поздно поел")).toBeNull();
  });
});

describe("what the page promises about devices", () => {
  const ru = getDictionary("ru").cabinet.sleep;
  const en = getDictionary("en").cabinet.sleep;

  it("says plainly that a website cannot reach an Apple Watch", () => {
    // The one promise that would be a lie. Apple releases Health data only
    // through the phone, so "connect your watch" cannot mean what a person
    // reading it would assume.
    expect(ru.devicesHonest).toContain("Apple Watch");
    expect(en.devicesHonest).toContain("Apple Watch");
  });

  it("offers the thing that does work — a file — in both languages", () => {
    expect(ru.devicesText).toContain("CSV");
    expect(en.devicesText).toContain("CSV");
  });

  it("says the assistant does not diagnose, in the person's own language", () => {
    expect(ru.adviceText).toContain("Диагнозов он не ставит");
    expect(en.adviceText).toContain("does not diagnose");
  });

  it("tells the person to check the lines that could not be read", () => {
    // An import that silently drops rows is worse than one that fails.
    expect(ru.importSkippedHint).toContain("сами");
    expect(en.importSkippedHint).toContain("yourself");
  });
});

describe("the sleep tool and the provider migration", () => {
  it("asks no provider by name", () => {
    // Phase 4 of the provider-independence specification has to reach zero
    // direct provider calls in business modules. New code must not add to
    // the pile it is trying to empty.
    const dir = join(process.cwd(), "lib/sleep");

    for (const file of readdirSync(dir)) {
      const source = readFileSync(join(dir, file), "utf8");

      expect(source, file).not.toContain("askClaude");
      expect(source, file).not.toContain("askOpenAi");
    }
  });
});
