import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { isExplicitOutreachRefusal } from "@/lib/assistant/outreach";

const migration = readFileSync("supabase/migrations/20260909210136_assistant_outreach.sql", "utf8");
const core = readFileSync("supabase/migrations/20260621220000_create_core_schema.sql", "utf8");
const id = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
let db: PGlite;
const query = async (sql: string, params: unknown[] = []) => (await db.query<Record<string, unknown>>(sql, params)).rows;
const deliver = async (welcomeOnly = false) => (await query(
  "select public.deliver_assistant_outreach(null, $1, 100) as sent", [welcomeOnly]
))[0] as { sent: number };

beforeAll(async () => {
  db = new PGlite();
  // Only prerequisite auth/Case scaffolding is synthetic. Profiles and history
  // come from the repository schema; the entire new migration runs unchanged.
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    ${core.match(/create type public.actor_role as enum \([\s\S]*?\);/)![0]}
    ${core.match(/create type public.profile_status as enum \([\s\S]*?\);/)![0]}
    ${core.match(/create table public.profiles \([\s\S]*?\n\);/)![0]}
    create table public.client_cases(id uuid primary key);
  `);
  await db.exec(readFileSync("supabase/migrations/20260801120000_assistant_messages.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/20260816005441_localize_assistant_history.sql", "utf8"));
  await db.exec(migration);
  await db.exec(readFileSync("supabase/migrations/20260909221034_assistant_outreach_skip_busy_preferences.sql", "utf8"));
  await db.exec(`grant usage on schema public, auth to service_role, authenticated, anon;
    grant select, insert, update on public.profiles, public.assistant_messages to service_role;
    grant usage, select on all sequences in schema public to service_role;
    grant select on public.assistant_messages to authenticated;`);
}, 30_000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec("reset role; truncate auth.users cascade;");
  await query("insert into auth.users values ($1), ($2)", [id, other]);
  await query("insert into public.profiles(id, locale) values ($1, 'ru'), ($2, 'en')", [id, other]);
  await db.exec("set role service_role");
});

describe("assistant outreach PostgreSQL integration", () => {
  it("creates one bilingual saved welcome per profile and safely retries", async () => {
    expect(await deliver()).toEqual({ sent: 2 });
    expect(await deliver()).toEqual({ sent: 0 });
    const rows = await query("select * from public.assistant_messages order by locale");
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.role).toBe("assistant");
      expect(row.outreach_number).toBe(0);
      expect(row.case_id).toBeNull();
      expect(row.outreach_translations).toHaveProperty("ru");
      expect(row.outreach_translations).toHaveProperty("en");
      expect(row.content).toBe((row.outreach_translations as Record<string, string>)[row.locale as string]);
    }
  });

  it("scopes an immediate registration welcome to exactly one profile", async () => {
    expect(await query("select public.deliver_assistant_outreach($1, true, 1) as sent", [id])).toEqual([{ sent: 1 }]);
    expect(await query("select distinct profile_id from public.assistant_messages")).toEqual([{ profile_id: id }]);
  });

  it("does not deliver before 72 elapsed hours and does deliver after the boundary", async () => {
    await deliver();
    await db.exec("update public.assistant_outreach_state set last_sent_at = clock_timestamp() - interval '72 hours' + interval '1 minute'");
    expect(await deliver()).toEqual({ sent: 0 });
    await db.exec("update public.assistant_outreach_state set last_sent_at = clock_timestamp() - interval '72 hours'");
    expect(await deliver()).toEqual({ sent: 2 });
    expect(await deliver()).toEqual({ sent: 0 });
    const counts = await query("select outreach_number, count(*)::int as n from public.assistant_messages group by 1 order by 1");
    expect(counts).toEqual([{ outreach_number: 0, n: 2 }, { outreach_number: 1, n: 2 }]);
  });

  it("never catches up missed intervals with a burst or repeats a welcome", async () => {
    await deliver();
    await db.exec("update public.assistant_outreach_state set last_sent_at = now() - interval '100 days'");
    expect(await deliver(true)).toEqual({ sent: 0 });
    expect(await deliver()).toEqual({ sent: 2 });
    expect(await deliver()).toEqual({ sent: 0 });
  });

  it("honors a refusal before the first welcome and after a follow-up becomes due", async () => {
    await query("insert into public.assistant_outreach_state(profile_id, opted_out) values ($1, true)", [id]);
    expect(await deliver()).toEqual({ sent: 1 });
    await db.exec("update public.assistant_outreach_state set opted_out = true");
    expect(await deliver()).toEqual({ sent: 0 });
    expect(await query("select * from public.assistant_messages where profile_id = $1", [id])).toHaveLength(0);
  });

  it.each(["Пожалуйста, не пишите мне", "Не присылай сообщения", "Отписаться", "Please stop messaging me", "Don't send me messages", "Do not write to me", "unsubscribe"])("persists explicit refusal: %s", async (text) => {
    expect(isExplicitOutreachRefusal(text)).toBe(true);
    await query("insert into public.assistant_messages(profile_id, role, content, locale) values ($1, 'user', $2, 'ru')", [id, text]);
    expect(await query("select opted_out from public.assistant_outreach_state where profile_id = $1", [id])).toEqual([{ opted_out: true }]);
    expect(await deliver()).toEqual({ sent: 1 });
  });

  it("honors a historical refusal without an existing preference row", async () => {
    await db.exec("reset role; alter table public.assistant_messages disable trigger assistant_outreach_refusal");
    await query("insert into public.assistant_messages(profile_id, role, content) values ($1, 'user', 'Не отправляйте мне сообщения')", [id]);
    await db.exec("alter table public.assistant_messages enable trigger assistant_outreach_refusal; set role service_role");
    expect(await deliver()).toEqual({ sent: 1 });
    expect(await query("select opted_out from public.assistant_outreach_state where profile_id = $1", [id])).toEqual([{ opted_out: true }]);
  });

  it("does not use assistant quotes or ordinary user questions as opt-outs", async () => {
    await query("insert into public.assistant_messages(profile_id, role, content) values ($1, 'assistant', 'unsubscribe'), ($1, 'user', 'Как загрузить документ?')", [id]);
    expect(await deliver()).toEqual({ sent: 2 });
  });

  it("excludes staff, suspended and closed accounts", async () => {
    await db.exec("update public.profiles set role = 'admin'");
    expect(await deliver()).toEqual({ sent: 0 });
    await db.exec("update public.profiles set role = 'client', status = 'suspended'");
    expect(await deliver()).toEqual({ sent: 0 });
    await db.exec("update public.profiles set status = 'closed'");
    expect(await deliver()).toEqual({ sent: 0 });
  });

  it("bounds the batch and processes the next profile on retry", async () => {
    expect(await query("select public.deliver_assistant_outreach(null, false, 1) as sent")).toEqual([{ sent: 1 }]);
    expect(await query("select public.deliver_assistant_outreach(null, false, 1) as sent")).toEqual([{ sent: 1 }]);
    expect(await deliver()).toEqual({ sent: 0 });
    await expect(query("select public.deliver_assistant_outreach(null, false, 501)")).rejects.toThrow("Invalid batch size");
  });

  it("rolls back the delivery cursor and message together on a write failure", async () => {
    await db.exec("reset role; alter table public.assistant_messages add constraint synthetic_failure check (outreach_number is null); set role service_role");
    try {
      await expect(deliver()).rejects.toThrow("synthetic_failure");
      expect(await query("select * from public.assistant_messages")).toHaveLength(0);
      expect(await query("select * from public.assistant_outreach_state")).toHaveLength(0);
    } finally {
      await db.exec("reset role; alter table public.assistant_messages drop constraint synthetic_failure; set role service_role");
    }
    expect(await deliver()).toEqual({ sent: 2 });
  });

  it("enforces unique message numbers even for a direct duplicate insert", async () => {
    await deliver();
    await expect(query(`insert into public.assistant_messages(profile_id, role, content, outreach_number, outreach_translations)
      select profile_id, role, content, outreach_number, outreach_translations from public.assistant_messages limit 1`)).rejects.toThrow("assistant_outreach_message_once");
  });

  it.each(["anon", "authenticated"])("denies %s direct delivery and preference writes", async (role) => {
    await db.exec(`reset role; set role ${role}`);
    await expect(deliver()).rejects.toThrow("permission denied");
    await expect(query("insert into public.assistant_outreach_state(profile_id) values ($1)", [id])).rejects.toThrow("permission denied");
  });

  it("keeps saved outreach readable only by its owner through existing RLS", async () => {
    await deliver();
    await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub = '${id}'`);
    expect(await query("select profile_id from public.assistant_messages")).toEqual([{ profile_id: id }]);
  });
});
