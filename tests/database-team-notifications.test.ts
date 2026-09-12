import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const route = fs.readFileSync(
  path.join(process.cwd(), "app", "api", "notifications", "database", "route.ts"),
  "utf8"
);
const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260818120000_database_team_notifications.sql"
  ),
  "utf8"
);
const relay = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase",
    "functions",
    "database-team-notifications",
    "index.ts"
  ),
  "utf8"
);

describe("database-driven client notifications", () => {
  it("listens for both new profiles and new client cases", () => {
    expect(migration).toContain("after insert on public.profiles");
    expect(migration).toContain("after insert on public.client_cases");
    expect(migration).toContain("jsonb_build_object('id', new.id)");
  });

  it("does not send personal data through the database webhook", () => {
    expect(migration).not.toContain("new.email");
    expect(migration).not.toContain("new.phone");
    expect(migration).not.toContain("new.full_name");
  });

  it("authenticates both hops before Telegram delivery", () => {
    expect(relay).toContain("EXPECTED_SECRET_HASH");
    expect(relay).toContain('"x-webhook-secret"');
    expect(route).toContain('request.headers.get("apikey")');
    expect(route).toContain("timingSafeEqual");
  });

  it("deduplicates each registration and case notification", () => {
    expect(route).toContain("new-registration:");
    expect(route).toContain("new-case:");
    expect(route).toContain('role !== "client"');
  });

  it("keeps bilingual sources covered through the shared database", () => {
    expect(route).toContain("Источник: общая база (сайт или приложение)");
    expect(route).toContain('table !== "profiles" && table !== "client_cases"');
  });
});
