import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { plural } from "@/lib/i18n/plural";

// The dictionary crosses the server/client boundary. Cabinet pages hand
// whole sections of it to client components as props, and React has to
// serialize those props — so every value in it must be serializable.
//
// A function in there does not fail the build and does not fail a type
// check. It fails at render, in production only, as "An error occurred in
// the Server Components render" with the real message stripped. That is
// what took the whole cabinet down: one pluralization helper written as a
// dictionary entry.
//
// This test is the guard. It walks the entire dictionary in both
// languages and refuses anything that cannot survive serialization.

function walk(
  value: unknown,
  path: string,
  offenders: string[],
  seen: WeakSet<object>
): void {
  if (value === null) {
    return;
  }

  const type = typeof value;

  if (type === "string" || type === "number" || type === "boolean") {
    return;
  }

  if (type === "function" || type === "symbol" || type === "bigint") {
    offenders.push(`${path} is a ${type}`);
    return;
  }

  if (type === "undefined") {
    offenders.push(`${path} is undefined`);
    return;
  }

  const object = value as object;

  if (seen.has(object)) {
    offenders.push(`${path} is a circular reference`);
    return;
  }

  seen.add(object);

  if (value instanceof Date || value instanceof RegExp || value instanceof Map ||
      value instanceof Set) {
    offenders.push(`${path} is a ${object.constructor.name}`);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`, offenders, seen));
    return;
  }

  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    walk(item, `${path}.${key}`, offenders, seen);
  }
}

describe.each(["ru", "en"] as const)("the %s dictionary", (locale) => {
  it("holds nothing that cannot be passed to a client component", () => {
    const offenders: string[] = [];

    walk(getDictionary(locale), locale, offenders, new WeakSet());

    expect(offenders).toEqual([]);
  });
});

describe("plural", () => {
  const RU = { rule: "ru" as const, one: "файл", few: "файла", many: "файлов" };

  it("uses the singular for 1, 21, 101", () => {
    for (const n of [1, 21, 101, 131]) {
      expect(plural(n, RU)).toBe("файл");
    }
  });

  it("uses the few form for 2-4, 22-24", () => {
    for (const n of [2, 3, 4, 22, 23, 24, 102]) {
      expect(plural(n, RU)).toBe("файла");
    }
  });

  it("uses the many form for 5-20 and for zero", () => {
    for (const n of [0, 5, 9, 10, 20, 25, 100]) {
      expect(plural(n, RU)).toBe("файлов");
    }
  });

  it("keeps the teens on the many form, which the modulo rules alone miss", () => {
    // The old inline helper got these wrong: 11-14 end in 1-4 but take the
    // "many" form, and 21 ends in 1 but takes the singular.
    for (const n of [11, 12, 13, 14, 111, 112, 113, 114]) {
      expect(plural(n, RU)).toBe("файлов");
    }
  });

  it("collapses to two forms for English", () => {
    const EN = { rule: "en" as const, one: "file", few: "files", many: "files" };

    expect(plural(1, EN)).toBe("file");
    for (const n of [0, 2, 5, 11, 21, 22]) {
      expect(plural(n, EN)).toBe("files");
    }
  });

  it("does not break on a negative or fractional count", () => {
    expect(plural(-1, RU)).toBe("файл");
    expect(plural(2.7, RU)).toBe("файла");
  });
});
