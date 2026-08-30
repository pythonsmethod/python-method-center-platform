import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("app/(admin)/admin/medical-digest/page.tsx", "utf8");
const action = readFileSync("app/(admin)/admin/medical-digest/actions.ts", "utf8");
const route = readFileSync("app/api/medical-digest/generate/route.ts", "utf8");
const digest = readFileSync("lib/medical-digest/digest.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260830193000_medical_digest.sql", "utf8");
const vercel = readFileSync("vercel.json", "utf8");

describe("Karen medical digest", () => {
  it("is a private bilingual staff workspace", () => {
    expect(page).toContain("getKarenAssistantUserState");
    expect(page).toContain("Утренний медицинский обзор");
    expect(page).toContain("Morning medical digest");
    expect(page).toContain("Открыть первоисточник");
    expect(page).toContain("Open primary source");
    expect(action).toContain("getKarenAssistantUserState");
  });

  it("builds traceable summaries from primary-source records", () => {
    expect(digest).toContain("europepmc/webservices/rest/search");
    expect(digest).toContain("pubmed.ncbi.nlm.nih.gov");
    expect(digest).toContain("Use only the supplied bibliographic record and abstract");
    expect(digest).toContain("limitationsRu");
    expect(digest).toContain("limitationsEn");
  });

  it("persists one issue per day and protects the daily cron", () => {
    expect(migration).toContain("issue_date date not null unique");
    expect(migration).toContain("enable row level security");
    expect(route).toContain("Bearer ${secret}");
    expect(vercel).toContain("/api/medical-digest/generate");
  });
});


