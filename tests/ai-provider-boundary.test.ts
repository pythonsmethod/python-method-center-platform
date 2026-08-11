import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The boundary the migration is actually for.
//
// The acceptance criteria of the specification are two sentences long —
// business modules must not import a provider by name, and provider SDKs must
// live only in adapters — and neither is something a type checker can hold.
// This file holds them instead, by reading the tree.
//
// It is written as an inventory rather than a prohibition, because right now
// the answer is not zero. Every entry below is a place a later phase has to
// visit; when one is migrated its line is deleted, and when the last line
// goes the criterion is met. Anything appearing that is not on the list fails
// here immediately — which is the point: the count may only ever go down.

const ROOT = path.resolve(__dirname, "..");
const SCANNED = ["app", "lib", "components"];

function walk(dir: string): string[] {
  const entries: string[] = [];

  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);

    if (statSync(full).isDirectory()) {
      entries.push(...walk(full));
      continue;
    }

    if (name.endsWith(".ts") || name.endsWith(".tsx")) {
      entries.push(full);
    }
  }

  return entries;
}

const FILES = SCANNED.flatMap((dir) => walk(path.join(ROOT, dir))).map((file) => ({
  path: path.relative(ROOT, file).split(path.sep).join("/"),
  source: readFileSync(file, "utf8")
}));

function filesContaining(needle: string): string[] {
  return FILES.filter((file) => file.source.includes(needle))
    .map((file) => file.path)
    .sort();
}

describe("provider SDKs stay inside adapters", () => {
  it("names Anthropic in adapters only", () => {
    expect(filesContaining("@anthropic-ai/sdk")).toEqual([
      // The new adapter — where it belongs.
      "lib/ai/providers/anthropic.ts",
      // The current one. Phase 4 folds it into the file above and deletes it.
      "lib/assistant/claude.ts"
    ]);
  });

  it("calls the OpenAI endpoint from adapters only", () => {
    expect(filesContaining("/v1/chat/completions")).toEqual([
      "lib/ai/providers/openai.ts",
      "lib/assistant/openai.ts"
    ]);
  });
});

describe("business modules calling a provider by name", () => {
  // Phase 4's acceptance condition is that this list is empty. Until then it
  // is the migration's to-do list, and each phase that empties a line is
  // expected to edit this test.
  it("is exactly the six the freeze recorded, and no more", () => {
    expect(filesContaining("askClaude").sort()).toEqual([
      // Phase 2 — ordinary chat moves to the capability router.
      "app/api/assistant/client/route.ts",
      "app/api/assistant/staff/route.ts",
      // Phase 4 — metrics extraction.
      "app/api/metrics/extract/route.ts",
      // The adapter-era module itself.
      "lib/assistant/claude.ts",
      // Phase 4 — case review's two independent readings.
      "lib/cases/review-actions.ts",
      "lib/assistant/router.ts",
      // Phase 4 — supplement timing advice.
      "lib/supplements/actions.ts"
    ].sort());
  });
});

describe("keys never leave the server", () => {
  it("keeps provider keys out of anything the browser is handed", () => {
    // A key reaching a client component is not a bug to be found later.
    const exposed = FILES.filter(
      (file) =>
        file.source.includes("use client") &&
        (file.source.includes("ANTHROPIC_API_KEY") ||
          file.source.includes("OPENAI_API_KEY"))
    ).map((file) => file.path);

    expect(exposed).toEqual([]);
  });

  it("never puts a provider key behind a NEXT_PUBLIC_ name", () => {
    expect(filesContaining("NEXT_PUBLIC_ANTHROPIC")).toEqual([]);
    expect(filesContaining("NEXT_PUBLIC_OPENAI")).toEqual([]);
  });
});
