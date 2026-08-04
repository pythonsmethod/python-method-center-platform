import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// A file marked "use server" may export only async functions.
//
// Next.js does not catch this at build time and TypeScript cannot see it
// at all. It throws at runtime, with error code E352, the moment any
// action from that module is invoked — so the page renders fine, the form
// looks fine, and pressing the button takes the page down. That is exactly
// what happened when a supplement was added: three modules exported their
// initial form state as a plain object from a "use server" file, and every
// form they served — supplements, health metrics, profile details — was
// dead in production while everything looked healthy here.
//
// The convention that replaces it: the state objects live in a sibling
// *-state.ts module, which is a plain module and may export whatever it
// likes. This test enforces it across the whole repository.

const ROOTS = ["app", "components", "lib"];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }

  return out;
}

function hasUseServerDirective(source: string): boolean {
  // The directive, not a mention of it in a comment: it has to be the
  // first statement of the file.
  const withoutComments = source
    .replace(/^﻿/, "")
    .replace(/^(\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*))*/, "")
    .trimStart();

  return (
    withoutComments.startsWith('"use server"') ||
    withoutComments.startsWith("'use server'")
  );
}

// Value exports that are not functions. `export type` and `export
// interface` are erased before this ever matters, so they are allowed.
function offendingExports(source: string): string[] {
  const offenders: string[] = [];
  const pattern = /^export\s+(const|let|var|class|enum)\s+([A-Za-z0-9_$]+)/gm;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    const [line, keyword, name] = match;
    const rest = source.slice(match.index, match.index + 400);

    // `export const foo = async (...) => {}` is a function and is fine.
    if (keyword !== "class" && keyword !== "enum" && /=\s*async\b/.test(rest.split("\n")[0])) {
      continue;
    }

    offenders.push(`${name} (${line.trim()})`);
  }

  return offenders;
}

describe('files marked "use server"', () => {
  const files = ROOTS.flatMap((root) => walk(root));

  it("finds the action modules it is meant to be checking", () => {
    const serverFiles = files.filter((file) =>
      hasUseServerDirective(readFileSync(file, "utf8"))
    );

    // If this ever drops to zero the test has stopped testing anything.
    expect(serverFiles.length).toBeGreaterThan(3);
  });

  it("export only async functions", () => {
    const problems: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");

      if (!hasUseServerDirective(source)) {
        continue;
      }

      for (const offender of offendingExports(source)) {
        problems.push(`${file}: ${offender}`);
      }
    }

    expect(problems).toEqual([]);
  });
});
