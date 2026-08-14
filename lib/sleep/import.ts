// Reading a night out of a file a watch, a ring or a bracelet produced.
//
// There is no standard for these exports and there will not be one: Oura
// writes durations in seconds, Fitbit in minutes, Garmin as "7h 32m", and
// half of them put a full timestamp where the next one puts a bare clock.
// So this does not target one vendor. It looks at the header row, works out
// which column means what, and reads whatever it recognises — and says
// plainly which lines it could not read instead of quietly dropping them.
//
// A night that cannot be read is never guessed at. This is sleep data a
// person may show a doctor.

import { formatClock, isClock, sleepDuration, toMinutes } from "@/lib/sleep/sleep";

export type ImportedNight = {
  sleptOn: string;
  bedtime: string | null;
  wakeTime: string | null;
  durationMinutes: number | null;
  quality: number | null;
  awakenings: number | null;
};

export type SkippedRow = {
  line: number;
  reason: string;
};

export type ImportResult = {
  nights: ImportedNight[];
  skipped: SkippedRow[];
  // Which of the file's columns were understood, for the report shown to
  // the person: a file read "successfully" from the wrong column is worse
  // than a file that failed.
  recognized: string[];
};

export const MAX_IMPORT_ROWS = 800;

// Header synonyms. Lower-cased and stripped of punctuation before matching;
// a header matches if it contains one of these.
const HEADERS: Record<keyof ImportedNight | "wakeDate", string[]> = {
  sleptOn: ["date", "day", "дата", "день", "summary date"],
  bedtime: [
    "bedtime start",
    "sleep start",
    "start time",
    "went to bed",
    "отбой",
    "засыпание",
    "начало сна",
    "лег",
    "bedtime"
  ],
  wakeDate: ["bedtime end", "sleep end", "end time", "подъем", "подъём", "конец сна", "пробуждение"],
  wakeTime: [
    "bedtime end",
    "sleep end",
    "end time",
    "wake up time",
    "wake time",
    "подъем",
    "подъём",
    "конец сна",
    "пробуждение"
  ],
  durationMinutes: [
    "total sleep duration",
    "minutes asleep",
    "asleep time",
    "sleep duration",
    "duration",
    "продолжительность",
    "длительность",
    "время сна",
    "сон всего"
  ],
  quality: ["sleep score", "quality", "оценка", "качество", "балл"],
  awakenings: [
    "number of awakenings",
    "awakenings",
    "wake count",
    "пробуждений",
    "пробуждения"
  ]
};

function normalizeHeader(value: string): string {
  return value
    .replace(/^﻿/, "")
    .trim()
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ");
}

// Splits one CSV line. Handles quoted fields containing the delimiter and
// doubled quotes inside them.
function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }

      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }

    if (char === delimiter) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);

  return cells.map((cell) => cell.trim());
}

// Excel in a Russian locale writes semicolons; some exports use tabs.
function detectDelimiter(headerLine: string): string {
  const counts = [",", ";", "\t"].map((delimiter) => ({
    delimiter,
    count: splitLine(headerLine, delimiter).length
  }));

  counts.sort((a, b) => b.count - a.count);

  return counts[0].count > 1 ? counts[0].delimiter : ",";
}

const ISO_DATE = /(\d{4})-(\d{2})-(\d{2})/;
const DOTTED_DATE = /^(\d{2})[.\/](\d{2})[.\/](\d{4})/;

export function parseDate(value: string): string | null {
  const text = value.trim();
  const iso = ISO_DATE.exec(text);

  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const dotted = DOTTED_DATE.exec(text);

  if (dotted) {
    return `${dotted[3]}-${dotted[2]}-${dotted[1]}`;
  }

  return null;
}

// "23:32", "2026-08-08T23:32:00+03:00", "2026-08-08 23:32", "11:32 PM".
export function parseClockValue(value: string): string | null {
  const text = value.trim();

  if (isClock(text)) {
    return text;
  }

  const ampm = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)$/i.exec(text);

  if (ampm) {
    let hours = Number(ampm[1]) % 12;

    if (ampm[3].toLowerCase() === "pm") {
      hours += 12;
    }

    return formatClock(hours * 60 + Number(ampm[2]));
  }

  const clock = /[T\s](\d{2}):(\d{2})/.exec(text);

  if (clock) {
    return `${clock[1]}:${clock[2]}`;
  }

  return null;
}

// Duration written six different ways. When a bare number could be either
// seconds or minutes, magnitude decides: nobody sleeps more than 24 hours,
// so anything above 1440 is seconds.
export function parseDurationValue(
  value: string,
  header: string
): number | null {
  const text = value.trim().toLowerCase().replace(",", ".");

  if (!text) {
    return null;
  }

  const written = /^(?:(\d+)\s*(?:h|ч|hours?|час\w*))?\s*(?:(\d+)\s*(?:m|м|min\w*|мин\w*))?$/.exec(
    text
  );

  if (written && (written[1] || written[2])) {
    return Number(written[1] ?? 0) * 60 + Number(written[2] ?? 0);
  }

  const colon = /^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/.exec(text);

  if (colon) {
    return Number(colon[1]) * 60 + Number(colon[2]);
  }

  const number = Number(text);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  const saysSeconds = /sec|секунд/.test(header);
  const saysHours = /hour|час/.test(header);

  if (saysSeconds || number > 1440) {
    return Math.round(number / 60);
  }

  if (saysHours || (!Number.isInteger(number) && number <= 24)) {
    return Math.round(number * 60);
  }

  return Math.round(number);
}

// Oura's sleep score is 0–100, a person's own rating is 1–5. Both end up as
// the same 1–5 field, so a score is compressed rather than truncated.
export function parseQualityValue(value: string): number | null {
  const number = Number(value.trim().replace(",", "."));

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  if (number <= 5) {
    return Math.round(number);
  }

  if (number <= 100) {
    return Math.min(5, Math.max(1, Math.round(number / 20)));
  }

  return null;
}

export function parseSleepCsv(text: string): ImportResult {
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return {
      nights: [],
      skipped: [{ line: 1, reason: "В файле нет строк с данными." }],
      recognized: []
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delimiter).map(normalizeHeader);

  const columnFor = (field: keyof typeof HEADERS): number => {
    // First exact-ish match wins, and the more specific synonyms are listed
    // first so "bedtime start" is not eaten by "bedtime".
    for (const synonym of HEADERS[field]) {
      const index = headers.findIndex((header) => header.includes(synonym));

      if (index !== -1) {
        return index;
      }
    }

    return -1;
  };

  const columns = {
    sleptOn: columnFor("sleptOn"),
    bedtime: columnFor("bedtime"),
    wakeTime: columnFor("wakeTime"),
    wakeDate: columnFor("wakeDate"),
    durationMinutes: columnFor("durationMinutes"),
    quality: columnFor("quality"),
    awakenings: columnFor("awakenings")
  };

  // A file whose bedtime and wake columns are the same column is a file
  // where only one of them exists.
  if (columns.wakeTime === columns.bedtime) {
    columns.wakeTime = -1;
  }

  const recognized = Object.entries(columns)
    .filter(([field, index]) => index !== -1 && field !== "wakeDate")
    .map(([, index]) => headers[index]);

  if (columns.sleptOn === -1 && columns.wakeDate === -1) {
    return {
      nights: [],
      skipped: [
        {
          line: 1,
          reason:
            "Не нашёл столбец с датой. Нужен столбец «date», «дата» или время подъёма с датой."
        }
      ],
      recognized
    };
  }

  const nights: ImportedNight[] = [];
  const skipped: SkippedRow[] = [];
  const seen = new Set<string>();

  for (let index = 1; index < lines.length; index += 1) {
    if (nights.length >= MAX_IMPORT_ROWS) {
      skipped.push({
        line: index + 1,
        reason: `Прочитаны первые ${MAX_IMPORT_ROWS} ночей — остальные строки в этот раз пропущены.`
      });
      break;
    }

    const cells = splitLine(lines[index], delimiter);
    const cell = (position: number) =>
      position === -1 ? "" : (cells[position] ?? "");

    // The night belongs to the morning of waking, which is what the devices
    // themselves do.
    const sleptOn =
      parseDate(cell(columns.wakeDate)) ?? parseDate(cell(columns.sleptOn));

    if (!sleptOn) {
      skipped.push({
        line: index + 1,
        reason: "Не разобрал дату в этой строке."
      });
      continue;
    }

    if (seen.has(sleptOn)) {
      skipped.push({
        line: index + 1,
        reason: `Ночь ${sleptOn} уже была выше в файле — оставил первую.`
      });
      continue;
    }

    const bedtime = parseClockValue(cell(columns.bedtime));
    const wakeTime = parseClockValue(cell(columns.wakeTime));
    const stated = parseDurationValue(
      cell(columns.durationMinutes),
      headers[columns.durationMinutes] ?? ""
    );
    const computed =
      bedtime && wakeTime ? sleepDuration(bedtime, wakeTime) : null;
    const durationMinutes = stated ?? computed;

    if (durationMinutes === null && !bedtime && !wakeTime) {
      skipped.push({
        line: index + 1,
        reason: `Ночь ${sleptOn}: в строке нет ни времени сна, ни продолжительности.`
      });
      continue;
    }

    seen.add(sleptOn);
    nights.push({
      sleptOn,
      bedtime,
      wakeTime,
      durationMinutes,
      quality: parseQualityValue(cell(columns.quality)),
      awakenings: (() => {
        const raw = Number(cell(columns.awakenings).trim());

        return Number.isInteger(raw) && raw >= 0 && raw <= 50 ? raw : null;
      })()
    });
  }

  return { nights, skipped, recognized };
}

// Sanity check used before anything is written: an import must never create
// a night that could not have happened.
export function isPlausibleNight(night: ImportedNight): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night.sleptOn)) {
    return false;
  }

  if (night.bedtime && toMinutes(night.bedtime) === null) {
    return false;
  }

  if (night.wakeTime && toMinutes(night.wakeTime) === null) {
    return false;
  }

  if (
    night.durationMinutes !== null &&
    (night.durationMinutes <= 0 || night.durationMinutes > 1440)
  ) {
    return false;
  }

  return true;
}
