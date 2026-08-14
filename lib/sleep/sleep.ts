// Sleep arithmetic. Pure, so it can be tested without a database and used
// on both sides of the wire.

export type SleepEntry = {
  id: string;
  sleptOn: string; // ISO date of the morning the person woke up
  bedtime: string | null; // "HH:MM"
  wakeTime: string | null; // "HH:MM"
  durationMinutes: number | null;
  quality: number | null; // 1..5, the person's own judgement
  awakenings: number | null;
  note: string | null;
  source: string; // "manual" or the import the night came from
  device: string | null;
};

export const MAX_SLEEP_MINUTES = 1440;

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isClock(value: string): boolean {
  return CLOCK.test(value);
}

export function toMinutes(clock: string): number | null {
  const match = CLOCK.exec(clock.trim());

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatClock(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

// Bedtime 23:30 → wake 07:00 is seven and a half hours, not a negative
// number. Sleep almost always crosses midnight, so the wrap is the normal
// case here rather than the edge case.
export function sleepDuration(
  bedtime: string,
  wakeTime: string
): number | null {
  const from = toMinutes(bedtime);
  const to = toMinutes(wakeTime);

  if (from === null || to === null) {
    return null;
  }

  const minutes = to >= from ? to - from : 1440 - from + to;

  // Equal times are a typo, not a 24-hour sleep.
  return minutes === 0 ? null : minutes;
}

export type DurationUnits = { hour: string; minute: string };

export const RU_UNITS: DurationUnits = { hour: "ч", minute: "мин" };

export function formatDuration(
  minutes: number,
  units: DurationUnits = RU_UNITS
): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${rest} ${units.minute}`;
  }

  return rest === 0
    ? `${hours} ${units.hour}`
    : `${hours} ${units.hour} ${rest} ${units.minute}`;
}

// Bedtimes cluster around midnight, so they cannot be averaged as plain
// numbers: 23:50 and 00:10 average to 12:00 midday, which is nonsense. They
// are averaged as angles on a 24-hour circle instead.
export function averageClock(clocks: string[]): string | null {
  const minutes = clocks
    .map(toMinutes)
    .filter((value): value is number => value !== null);

  if (minutes.length === 0) {
    return null;
  }

  let x = 0;
  let y = 0;

  for (const value of minutes) {
    const angle = (value / 1440) * 2 * Math.PI;
    x += Math.cos(angle);
    y += Math.sin(angle);
  }

  if (Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9) {
    return null;
  }

  const mean = Math.atan2(y / minutes.length, x / minutes.length);

  return formatClock(Math.round((mean / (2 * Math.PI)) * 1440));
}

// How much the bedtime moves from night to night, in minutes — again on the
// circle. Regularity is the part of sleep a person can actually change, so
// it is worth a number of its own.
export function bedtimeSpread(clocks: string[]): number | null {
  const minutes = clocks
    .map(toMinutes)
    .filter((value): value is number => value !== null);

  if (minutes.length < 2) {
    return null;
  }

  let x = 0;
  let y = 0;

  for (const value of minutes) {
    const angle = (value / 1440) * 2 * Math.PI;
    x += Math.cos(angle);
    y += Math.sin(angle);
  }

  const r = Math.sqrt(x * x + y * y) / minutes.length;

  if (r >= 1) {
    return 0;
  }

  // Circular standard deviation, converted from radians to minutes.
  const radians = Math.sqrt(-2 * Math.log(Math.max(r, 1e-9)));

  return Math.round((radians / (2 * Math.PI)) * 1440);
}

export type SleepStats = {
  nights: number;
  averageMinutes: number | null;
  averageQuality: number | null;
  averageBedtime: string | null;
  averageWake: string | null;
  spreadMinutes: number | null;
  shortest: number | null;
  longest: number | null;
};

export function summarize(entries: SleepEntry[]): SleepStats {
  const durations = entries
    .map((entry) => entry.durationMinutes)
    .filter((value): value is number => typeof value === "number" && value > 0);
  const qualities = entries
    .map((entry) => entry.quality)
    .filter((value): value is number => typeof value === "number");
  const bedtimes = entries
    .map((entry) => entry.bedtime)
    .filter((value): value is string => Boolean(value));
  const wakes = entries
    .map((entry) => entry.wakeTime)
    .filter((value): value is string => Boolean(value));

  const average = (values: number[]) =>
    values.length === 0
      ? null
      : values.reduce((sum, value) => sum + value, 0) / values.length;

  const averageMinutes = average(durations);
  const averageQuality = average(qualities);

  return {
    nights: entries.length,
    averageMinutes: averageMinutes === null ? null : Math.round(averageMinutes),
    averageQuality:
      averageQuality === null ? null : Math.round(averageQuality * 10) / 10,
    averageBedtime: averageClock(bedtimes),
    averageWake: averageClock(wakes),
    spreadMinutes: bedtimeSpread(bedtimes),
    shortest: durations.length > 0 ? Math.min(...durations) : null,
    longest: durations.length > 0 ? Math.max(...durations) : null
  };
}

// What the assistant is given. Deliberately the person's own numbers and
// nothing else — no scores the platform invented, no interpretation done
// before the model sees the data.
export function describeForAssistant(entries: SleepEntry[]): string {
  if (entries.length === 0) {
    return "";
  }

  const stats = summarize(entries);
  const lines = [
    `Ночей записано: ${stats.nights}.`,
    stats.averageMinutes !== null
      ? `Средняя продолжительность сна: ${formatDuration(stats.averageMinutes)}.`
      : null,
    stats.shortest !== null && stats.longest !== null
      ? `Самая короткая ночь: ${formatDuration(stats.shortest)}, самая длинная: ${formatDuration(stats.longest)}.`
      : null,
    stats.averageBedtime
      ? `Обычное время отхода ко сну: ${stats.averageBedtime}.`
      : null,
    stats.averageWake ? `Обычный подъём: ${stats.averageWake}.` : null,
    stats.spreadMinutes !== null
      ? `Разброс времени засыпания от ночи к ночи: около ${stats.spreadMinutes} минут.`
      : null,
    stats.averageQuality !== null
      ? `Средняя оценка самочувствия после сна: ${stats.averageQuality} из 5 (оценка самого человека).`
      : null
  ].filter(Boolean);

  const nights = entries
    .slice(0, 14)
    .map((entry) => {
      const parts = [
        entry.sleptOn,
        entry.bedtime && entry.wakeTime
          ? `${entry.bedtime}–${entry.wakeTime}`
          : null,
        entry.durationMinutes !== null
          ? formatDuration(entry.durationMinutes)
          : null,
        entry.quality !== null ? `самочувствие ${entry.quality}/5` : null,
        entry.awakenings !== null ? `пробуждений: ${entry.awakenings}` : null,
        entry.note ? `заметка: ${entry.note}` : null
      ].filter(Boolean);

      return `— ${parts.join("; ")}`;
    })
    .join("\n");

  return `${lines.join("\n")}\n\nПоследние ночи:\n${nights}`;
}
