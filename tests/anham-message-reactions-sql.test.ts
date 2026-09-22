import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const core = readFileSync("supabase/migrations/20260621220000_create_core_schema.sql", "utf8");
const id = "00000000-0000-4000-8000-000000000001";
let db: PGlite;
const query = async (sql: string, params: unknown[] = []) => (await db.query<Record<string, unknown>>(sql, params)).rows;

beforeAll(async () => {
  db = new PGlite();
  // Only prerequisite auth/Case scaffolding is synthetic. Profiles and history
  // come from the repository schema; the reactions migration runs unchanged.
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
  await db.exec(readFileSync("supabase/migrations/20260918120000_anham_message_reactions.sql", "utf8"));
  // Applying the migration twice must be harmless.
  await db.exec(readFileSync("supabase/migrations/20260918120000_anham_message_reactions.sql", "utf8"));
  await query("insert into auth.users values ($1)", [id]);
  await query("insert into public.profiles(id, locale) values ($1, 'ru')", [id]);
}, 30_000);
afterAll(async () => { await db?.close(); });

describe("assistant_messages.reaction migration", () => {
  it("stores an allowlisted reaction on the person's message and defaults to none", async () => {
    await query("insert into public.assistant_messages(profile_id, role, content, reaction) values ($1, 'user', 'Прошёл 5000 шагов', 'clap')", [id]);
    await query("insert into public.assistant_messages(profile_id, role, content) values ($1, 'assistant', 'Отличный шаг.')", [id]);
    const rows = await query("select role, reaction from public.assistant_messages order by message_sequence");
    expect(rows).toEqual([{ role: "user", reaction: "clap" }, { role: "assistant", reaction: null }]);
  });

  it("rejects free text, emoji and any reaction on an assistant row", async () => {
    for (const value of ["fire", "👏", "<b>clap</b>", ""]) {
      await expect(query("insert into public.assistant_messages(profile_id, role, content, reaction) values ($1, 'user', 'x', $2)", [id, value]))
        .rejects.toThrow("assistant_messages_reaction_allowlist");
    }
    await expect(query("insert into public.assistant_messages(profile_id, role, content, reaction) values ($1, 'assistant', 'x', 'heart')", [id]))
      .rejects.toThrow("assistant_messages_reaction_allowlist");
  });
});
