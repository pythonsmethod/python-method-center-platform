import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { staffAssistantView } from "@/lib/assistant/staff-provider";
import { canSeeProviderNames, isFounderEmail } from "@/lib/auth/require-founder";

// Nobody but the founder learns which model is answering.
//
// Her decision, and the reason behind it: a person choosing between vendors
// starts trusting the answer for the wrong reason — the name instead of the
// content — and a client who learns the name starts asking for that name.
// Professor Python is included in "nobody": he should be reading the answer,
// not the label on it. Only the founder sees the machinery.
//
// Two separate things have to hold, and they fail differently. The gate
// decides who sees; the scan makes sure no vendor name is sitting in text
// that reaches a screen regardless of the gate.

const ROOT = process.cwd();

describe("who is allowed to see which model answered", () => {
  const original = process.env.FOUNDER_EMAILS;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.FOUNDER_EMAILS;
    } else {
      process.env.FOUNDER_EMAILS = original;
    }
  });

  it("fails closed when no allowlist is configured", () => {
    // The important case. An unset environment variable must not quietly
    // hand the whole team the view: an empty list means nobody, not
    // everybody.
    delete process.env.FOUNDER_EMAILS;

    expect(canSeeProviderNames("anna@example.com")).toBe(false);
    expect(canSeeProviderNames(null)).toBe(false);
  });

  it("still lets any admin into the founder cabinet without a list", () => {
    // Cabinet access is a separate, older rule and is not tightened here.
    delete process.env.FOUNDER_EMAILS;

    expect(isFounderEmail("anna@example.com")).toBe(true);
  });

  it("shows the machinery to the founder and to nobody else", () => {
    process.env.FOUNDER_EMAILS = "anna@example.com";

    expect(canSeeProviderNames("Anna@Example.com")).toBe(true);
    expect(canSeeProviderNames("karen@example.com")).toBe(false);
    expect(canSeeProviderNames(null)).toBe(false);
  });
});

describe("what the team's chat does with a provider named in the request", () => {
  it("ignores it entirely — hiding the selector would not be enough", () => {
    // The browser can send whatever it likes; the decision is the server's.
    for (const requested of ["claude", "gpt", "both", "best", "nonsense"]) {
      expect(staffAssistantView(false, requested)).toEqual({
        provider: "best",
        attribution: false
      });
    }
  });

  it("keeps the answer as strong as it was, only unlabelled", () => {
    // "best" is what the team's chat has always defaulted to: both models
    // answer and an arbiter picks. Hiding the name must not quietly become
    // a downgrade to one model.
    expect(staffAssistantView(false, undefined).provider).toBe("best");
  });

  it("honours the founder's choice and names her winner", () => {
    expect(staffAssistantView(true, "gpt")).toEqual({
      provider: "gpt",
      attribution: false
    });
    expect(staffAssistantView(true, "best")).toEqual({
      provider: "best",
      attribution: true
    });
  });

  it("does not label the side-by-side mode, which labels itself", () => {
    expect(staffAssistantView(true, "both").attribution).toBe(false);
  });
});

// ---------------------------------------------------------------------------

// Every place a vendor may still be named, and why. A file not on this list
// may not contain one — that is the whole point of the scan. Adding a file
// here should be a decision someone makes on purpose.
const ALLOWED: Record<string, string> = {
  "lib/legal/policy-content.ts":
    "legal disclosure: the privacy policy must name who receives client data",
  "lib/founder/queries.ts": "the founder cabinet — her own view",
  "lib/assistant/claude.ts":
    "the provider adapter — the SDK class and its error types live here by design",
  "lib/assistant/router.ts":
    "the winner line, emitted only when attribution is asked for",
  "components/assistant/AssistantChat.tsx":
    "the picker, rendered only when providerChoice is passed",
  "app/api/assistant/staff/route.ts":
    "founder-only branch of the setup error text",
  "app/(admin)/admin/page.tsx": "founder-only branch of the setup error text"
};

const VENDORS = /claude|chatgpt|gpt|anthropic|openai/gi;

// Internal identifiers that happen to be spelled like a vendor: routing mode
// values, never shown to anyone.
const INTERNAL_TOKENS = new Set(["claude", "gpt", "openai", "anthropic"]);

function stripComments(source: string): string {
  let out = "";
  let index = 0;
  let state: "code" | "line" | "block" | "'" | '"' | "`" = "code";

  while (index < source.length) {
    const two = source.slice(index, index + 2);
    const char = source[index];

    if (state === "code") {
      if (two === "//") {
        state = "line";
        index += 2;
        continue;
      }

      if (two === "/*") {
        state = "block";
        index += 2;
        continue;
      }

      if (char === "'" || char === '"' || char === "`") {
        state = char;
      }

      out += char;
      index += 1;
      continue;
    }

    if (state === "line") {
      if (char === "\n") {
        state = "code";
        out += char;
      }

      index += 1;
      continue;
    }

    if (state === "block") {
      if (two === "*/") {
        state = "code";
        index += 2;
        continue;
      }

      index += 1;
      continue;
    }

    // Inside a string: copy it through, mind the escapes.
    if (char === "\\") {
      out += source.slice(index, index + 2);
      index += 2;
      continue;
    }

    if (char === state) {
      state = "code";
    }

    out += char;
    index += 1;
  }

  return out;
}

// Part of a longer identifier, an import path or a model id — code, not text
// anybody reads: askClaude, @/lib/assistant/claude, Anthropic.APIError,
// claude-opus-4-8.
const GLUED = /[A-Za-z0-9_@/.\-]/;

function vendorMentions(source: string): string[] {
  const code = stripComments(source);
  const found: string[] = [];

  for (const match of code.matchAll(VENDORS)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const before = code[start - 1] ?? "";
    const after = code[end] ?? "";

    if (GLUED.test(before) || GLUED.test(after)) {
      continue;
    }

    const quoted =
      (before === '"' || before === "'") &&
      after === before &&
      INTERNAL_TOKENS.has(match[0].toLowerCase());

    if (quoted) {
      continue;
    }

    found.push(code.slice(Math.max(0, start - 40), end + 40).replace(/\s+/g, " "));
  }

  return found;
}

function sourceFiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) {
      continue;
    }

    const full = join(dir, entry);

    if (statSync(full).isDirectory()) {
      files.push(...sourceFiles(full));
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }

  return files;
}

describe("no vendor name in anything a person can read", () => {
  it("holds across app, components and lib", () => {
    const offenders: string[] = [];

    for (const dir of ["app", "components", "lib"]) {
      for (const file of sourceFiles(join(ROOT, dir))) {
        const path = relative(ROOT, file);

        if (path in ALLOWED) {
          continue;
        }

        for (const mention of vendorMentions(readFileSync(file, "utf8"))) {
          offenders.push(`${path}: …${mention}…`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("keeps the privacy policy naming them, because the law requires it", () => {
    // The one place the names must stay. This is not "who answered better",
    // it is "who receives your data" — removing it would be a legal defect,
    // not a privacy win.
    const policy = readFileSync(join(ROOT, "lib/legal/policy-content.ts"), "utf8");

    expect(policy).toContain("Anthropic");
    expect(policy).toContain("OpenAI");
  });
});
