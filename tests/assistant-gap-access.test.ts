import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// Who may see the founder gap centre, and what the migration guarantees about
// the two tables behind it.

const mocks = vi.hoisted(() => ({ founder: vi.fn(), unread: vi.fn() }));

vi.mock("@/lib/auth/require-founder", () => ({ getFounderState: mocks.founder }));
vi.mock("@/lib/assistant/escalation-store", () => ({ getGapUnreadCount: mocks.unread }));
vi.mock("@/lib/i18n/api-errors", async (original) => ({
  ...(await original<typeof import("@/lib/i18n/api-errors")>()),
  apiErrorLocale: async () => "ru"
}));

import { GET } from "@/app/api/admin/notifications/unread/route";

describe("unread counter endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.unread.mockResolvedValue(3);
  });

  it.each([
    ["unauthenticated", { status: "unauthenticated" }],
    ["forbidden", { status: "forbidden" }],
    ["error", { status: "error", message: "boom" }],
    ["missing env", { status: "missing-env", missingEnvVars: ["SUPABASE_URL"] }]
  ])("refuses a %s caller without returning a number", async (_label, authState) => {
    mocks.founder.mockResolvedValue(authState);

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).not.toHaveProperty("unread");
    expect(mocks.unread).not.toHaveBeenCalled();
  });

  it("counts for the caller's own session, never a supplied id", async () => {
    mocks.founder.mockResolvedValue({
      status: "authorized",
      userId: "founder-session-id",
      email: "founder@example.test",
      role: "admin"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ unread: 3 });
    expect(mocks.unread).toHaveBeenCalledWith("founder-session-id");
  });
});

describe("gap notification migration", () => {
  const source = readFileSync(
    path.join(
      process.cwd(),
      "supabase/migrations/20260909211104_assistant_knowledge_gap_notifications.sql"
    ),
    "utf8"
  );
  // The statements only. The file's comments explain which privileges are
  // deliberately withheld, and naming them there must not read as granting
  // them here.
  const sql = source.replace(/--[^\n]*/g, "");

  it("creates both tables with row level security enabled", () => {
    for (const table of ["assistant_gap_events", "assistant_gap_reads"]) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(
        `revoke all on table public.${table} from public, anon, authenticated`
      );
    }
  });

  it("adds no policy, so anon and authenticated can read nothing", () => {
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).not.toMatch(/grant[^;]*to\s+(anon|authenticated)/i);
  });

  it("keeps events append-only: no update and no delete grant", () => {
    expect(sql).toContain("grant select, insert on table public.assistant_gap_events to service_role");
    expect(sql).not.toMatch(/grant[^;]*update[^;]*assistant_gap_events/i);
    expect(sql).not.toMatch(/grant[^;]*delete[^;]*assistant_gap_events/i);
  });

  it("lets a founder take a read mark back", () => {
    expect(sql).toContain(
      "grant select, insert, delete on table public.assistant_gap_reads to service_role"
    );
  });

  // The project carries an ALTER DEFAULT PRIVILEGES for schema public that
  // grants ALL on every new table to service_role. Without an explicit revoke
  // first, the narrow grants above add nothing and the append-only guarantee
  // is silently false. This was found against production and must not regress.
  it.each(["assistant_gap_events", "assistant_gap_reads"])(
    "revokes the default-privilege grant from service_role before granting on %s",
    (table) => {
      const revoke = sql.indexOf(`revoke all on table public.${table} from service_role`);
      const grant = sql.indexOf(`on table public.${table} to service_role`);

      expect(revoke).toBeGreaterThan(-1);
      expect(grant).toBeGreaterThan(revoke);
    }
  );

  it("makes one read mark per founder per event unique", () => {
    expect(sql).toMatch(/unique\s*\(gap_event_id,\s*founder_profile_id\)/);
  });

  it("closes the unread counter to anon and authenticated", () => {
    expect(sql).toContain("create function public.assistant_gap_unread_count");
    expect(sql).toContain(
      "revoke all on function public.assistant_gap_unread_count(uuid)\n  from public, anon, authenticated"
    );
    expect(sql).toContain(
      "grant execute on function public.assistant_gap_unread_count(uuid) to service_role"
    );
  });

  it("stores no question, no medical data and no client identifier", () => {
    const eventTable = sql.slice(
      sql.indexOf("create table public.assistant_gap_events"),
      sql.indexOf("comment on table public.assistant_gap_events")
    );

    for (const forbidden of [
      "profile_id",
      "case_id",
      "question",
      "content",
      "message",
      "email",
      "ip"
    ]) {
      expect(eventTable).not.toMatch(new RegExp(`^\\s*${forbidden}\\s`, "mi"));
    }
  });

  it("is additive: it drops and deletes nothing", () => {
    expect(sql).not.toMatch(/drop\s+(table|column|function|index)/i);
    expect(sql).not.toMatch(/^\s*delete\s+from/im);
    expect(sql).not.toMatch(/truncate/i);
  });
});
