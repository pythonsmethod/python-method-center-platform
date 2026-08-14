import { describe, expect, it } from "vitest";
import {
  averageClock,
  bedtimeSpread,
  describeForAssistant,
  formatDuration,
  sleepDuration,
  summarize,
  type SleepEntry
} from "@/lib/sleep/sleep";
import {
  isPlausibleNight,
  parseDurationValue,
  parseQualityValue,
  parseSleepCsv
} from "@/lib/sleep/import";

// The sleep tracker's arithmetic and its file import.
//
// Both are worth holding down because both are quietly wrong in ways nobody
// notices: sleep crosses midnight, so a naive subtraction gives a negative
// night; bedtimes cluster around midnight, so a naive average of 23:50 and
// 00:10 comes out as midday; and every device writes its export in its own
// units, so a file read "successfully" from the wrong column looks exactly
// like a file read correctly.

describe("a night that crosses midnight", () => {
  it("is measured forwards, not backwards", () => {
    expect(sleepDuration("23:30", "07:00")).toBe(450);
    expect(sleepDuration("01:15", "09:45")).toBe(510);
  });

  it("refuses a night of exactly zero", () => {
    // Same time for both fields is a typo, not twenty-four hours of sleep.
    expect(sleepDuration("23:00", "23:00")).toBeNull();
  });

  it("refuses times that are not times", () => {
    expect(sleepDuration("25:00", "07:00")).toBeNull();
    expect(sleepDuration("23:00", "abc")).toBeNull();
  });

  it("is shown in hours and minutes", () => {
    expect(formatDuration(450)).toBe("7 ч 30 мин");
    expect(formatDuration(420)).toBe("7 ч");
    expect(formatDuration(45)).toBe("45 мин");
  });
});

describe("the usual bedtime", () => {
  it("averages around midnight instead of through midday", () => {
    // The trap: (23:50 + 00:10) / 2 = 12:00. A person who goes to bed at
    // midnight would be told their usual bedtime is lunchtime.
    expect(averageClock(["23:50", "00:10"])).toBe("00:00");
    expect(averageClock(["23:00", "01:00"])).toBe("00:00");
  });

  it("still works for ordinary daytime clusters", () => {
    expect(averageClock(["07:00", "07:30", "08:00"])).toBe("07:30");
  });

  it("is nothing at all when there is nothing to average", () => {
    expect(averageClock([])).toBeNull();
  });

  it("measures how much the bedtime moves, also around midnight", () => {
    expect(bedtimeSpread(["23:00", "23:00", "23:00"])).toBe(0);

    const steady = bedtimeSpread(["23:00", "23:15", "22:50"]) ?? 0;
    const scattered = bedtimeSpread(["21:00", "01:30", "23:45"]) ?? 0;

    expect(steady).toBeLessThan(scattered);
    expect(bedtimeSpread(["23:00"])).toBeNull();
  });
});

const NIGHTS: SleepEntry[] = [
  {
    id: "1",
    sleptOn: "2026-08-09",
    bedtime: "23:30",
    wakeTime: "07:00",
    durationMinutes: 450,
    quality: 4,
    awakenings: 1,
    note: null,
    source: "manual",
    device: null
  },
  {
    id: "2",
    sleptOn: "2026-08-08",
    bedtime: "00:10",
    wakeTime: "06:40",
    durationMinutes: 390,
    quality: 3,
    awakenings: 2,
    note: "душно",
    source: "manual",
    device: null
  }
];

describe("the summary a person and the assistant both see", () => {
  it("counts only what was actually written down", () => {
    const stats = summarize(NIGHTS);

    expect(stats.nights).toBe(2);
    expect(stats.averageMinutes).toBe(420);
    expect(stats.averageQuality).toBe(3.5);
    expect(stats.shortest).toBe(390);
    expect(stats.longest).toBe(450);
  });

  it("says nothing about a night nobody recorded", () => {
    const stats = summarize([]);

    expect(stats.nights).toBe(0);
    expect(stats.averageMinutes).toBeNull();
    expect(stats.averageQuality).toBeNull();
  });

  it("hands the assistant the person's own numbers and no invented ones", () => {
    const text = describeForAssistant(NIGHTS);

    expect(text).toContain("Ночей записано: 2");
    expect(text).toContain("7 ч");
    expect(text).toContain("душно");
    // The quality figure must arrive labelled as the person's own judgement,
    // so the model cannot read it as a device's measurement.
    expect(text).toContain("оценка самого человека");
  });

  it("gives the assistant nothing when there is nothing", () => {
    expect(describeForAssistant([])).toBe("");
  });
});

// ---------------------------------------------------------------------------

describe("reading a ring's export", () => {
  // Oura: durations in seconds, timestamps with a timezone, a 0–100 score.
  const OURA = [
    "date,Sleep Score,Total Sleep Duration,Total Bedtime,Awake Time,Bedtime Start,Bedtime End",
    "2026-08-09,84,27180,29400,2220,2026-08-08T23:32:00+03:00,2026-08-09T07:42:00+03:00",
    "2026-08-08,71,23400,25200,1800,2026-08-07T00:12:00+03:00,2026-08-08T06:42:00+03:00"
  ].join("\n");

  it("reads the nights, the times and the duration", () => {
    const result = parseSleepCsv(OURA);

    expect(result.skipped).toEqual([]);
    expect(result.nights).toHaveLength(2);

    const [first] = result.nights;

    expect(first.sleptOn).toBe("2026-08-09");
    expect(first.bedtime).toBe("23:32");
    expect(first.wakeTime).toBe("07:42");
    // 27180 seconds is 7 h 33 m. Read as minutes it would be 18 days.
    expect(first.durationMinutes).toBe(453);
  });

  it("brings a 0–100 score down to the five-point scale", () => {
    expect(parseSleepCsv(OURA).nights[0].quality).toBe(4);
  });
});

describe("reading a watch's export", () => {
  // Fitbit: minutes, plain timestamps, an explicit awakenings column, and
  // no column called "date" at all.
  const FITBIT = [
    "Start Time,End Time,Minutes Asleep,Minutes Awake,Number of Awakenings,Time in Bed",
    "2026-08-08 23:32,2026-08-09 07:42,453,37,3,490",
    "2026-08-07 00:12,2026-08-08 06:42,390,30,2,420"
  ].join("\n");

  it("files the night under the morning of waking", () => {
    const result = parseSleepCsv(FITBIT);

    expect(result.nights[0].sleptOn).toBe("2026-08-09");
    expect(result.nights[0].durationMinutes).toBe(453);
    expect(result.nights[0].awakenings).toBe(3);
  });
});

describe("reading an export made on a Russian computer", () => {
  // Semicolons from Excel, a dotted date, a written duration, Russian
  // headers.
  const RU = [
    "Дата;Продолжительность;Отбой;Подъём;Пробуждений",
    "09.08.2026;7ч 32м;23:32;07:42;2"
  ].join("\n");

  it("reads it as readily as the English ones", () => {
    const result = parseSleepCsv(RU);

    expect(result.skipped).toEqual([]);
    expect(result.nights[0]).toMatchObject({
      sleptOn: "2026-08-09",
      bedtime: "23:32",
      wakeTime: "07:42",
      durationMinutes: 452,
      awakenings: 2
    });
  });
});

describe("what the import refuses to do", () => {
  it("never invents a night it could not read", () => {
    const broken = [
      "date,Total Sleep Duration",
      "not-a-date,27180",
      "2026-08-09,",
      "2026-08-08,27180"
    ].join("\n");

    const result = parseSleepCsv(broken);

    expect(result.nights).toHaveLength(1);
    expect(result.nights[0].sleptOn).toBe("2026-08-08");
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped[0].line).toBe(2);
    expect(result.skipped[1].reason).toContain("2026-08-09");
  });

  it("says which line it could not read, so a person can go and look", () => {
    const result = parseSleepCsv("date,Total Sleep Duration\nnot-a-date,27180");

    expect(result.skipped[0]).toEqual({
      line: 2,
      reason: "Не разобрал дату в этой строке."
    });
  });

  it("keeps the first of two rows for the same night", () => {
    const twice = [
      "date,Minutes Asleep",
      "2026-08-09,453",
      "2026-08-09,390"
    ].join("\n");

    const result = parseSleepCsv(twice);

    expect(result.nights).toHaveLength(1);
    expect(result.nights[0].durationMinutes).toBe(453);
    expect(result.skipped[0].reason).toContain("уже была выше");
  });

  it("explains itself when there is no date column at all", () => {
    const result = parseSleepCsv("Sleep Score,Minutes Asleep\n84,453");

    expect(result.nights).toEqual([]);
    expect(result.skipped[0].reason).toContain("столбец с датой");
  });

  it("reports which columns it understood", () => {
    const result = parseSleepCsv(
      "date,Minutes Asleep,Sleep Score\n2026-08-09,453,84"
    );

    expect(result.recognized).toContain("minutes asleep");
    expect(result.recognized).toContain("sleep score");
  });

  it("rejects a night that could not have happened", () => {
    expect(
      isPlausibleNight({
        sleptOn: "2026-08-09",
        bedtime: null,
        wakeTime: null,
        durationMinutes: 2000,
        quality: null,
        awakenings: null
      })
    ).toBe(false);

    expect(
      isPlausibleNight({
        sleptOn: "09.08.2026",
        bedtime: null,
        wakeTime: null,
        durationMinutes: 400,
        quality: null,
        awakenings: null
      })
    ).toBe(false);
  });
});

describe("units, one by one", () => {
  it("tells seconds from minutes by size, and by the column name", () => {
    expect(parseDurationValue("27180", "total sleep duration")).toBe(453);
    expect(parseDurationValue("453", "minutes asleep")).toBe(453);
    expect(parseDurationValue("450", "sleep seconds")).toBe(8);
  });

  it("reads durations written the way people write them", () => {
    expect(parseDurationValue("7h 32m", "duration")).toBe(452);
    expect(parseDurationValue("7ч 32м", "продолжительность")).toBe(452);
    expect(parseDurationValue("7:32", "duration")).toBe(452);
    expect(parseDurationValue("7,5", "часы")).toBe(450);
  });

  it("leaves an empty or nonsense cell empty", () => {
    expect(parseDurationValue("", "duration")).toBeNull();
    expect(parseDurationValue("—", "duration")).toBeNull();
    expect(parseQualityValue("")).toBeNull();
  });
});
