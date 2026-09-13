import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const db = new PGlite();
beforeAll(async () => {
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  await db.exec(readFileSync("supabase/migrations/20260909210803_product_analytics.sql", "utf8"));
}, 30000);
afterAll(async () => { await db.close(); });

describe("isolated PostgreSQL analytics integration", () => {
  it("denies table and RPC access to anonymous and authenticated roles", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await expect(db.query("select * from public.product_events")).rejects.toThrow(/permission denied/);
      await expect(db.query("select public.product_analytics_summary(now()-interval '7 days',now())")).rejects.toThrow(/permission denied/);
      await expect(db.query("select public.record_product_event('11111111-1111-1111-1111-111111111111','landing_view','ru')")).rejects.toThrow(/permission denied/);
      await db.exec("reset role");
    }
  });
  it("deduplicates retries, validates vocabulary and returns real zero with unknown conversion", async () => {
    await db.exec("set role service_role");
    await db.exec("select public.record_product_event('11111111-1111-1111-1111-111111111111','landing_view','ru'); select public.record_product_event('11111111-1111-1111-1111-111111111111','landing_view','ru');");
    expect((await db.query<{ n: number }>("select count(*)::int as n from product_events")).rows[0].n).toBe(1);
    await expect(db.query("select public.record_product_event('11111111-1111-1111-1111-111111111111','arbitrary_phi','ru')")).rejects.toThrow();
    const empty = await db.query<{ s: { steps: { journeys: number; conversionFromPrevious: number | null }[] } }>("select product_analytics_summary(now()-interval '7 days',now()-interval '1 day') as s");
    expect(empty.rows[0].s.steps.every(s => s.journeys === 0 && s.conversionFromPrevious === null)).toBe(true);
    await db.exec("reset role; truncate product_events;");
  });
  it("counts only ordered same-journey cohort completions and handles later retries", async () => {
    const steps = ["landing_view","registration_started","registration_completed","onboarding_view","onboarding_completed","cabinet_view","chat_completed"];
    for (let i=0;i<steps.length;i++) {
      await db.query("insert into product_events(journey_id,event,locale,occurred_at,minute_bucket) values ($1,$2,'ru',now()-interval '2 days'+$3::int*interval '1 minute',$3)", ["22222222-2222-2222-2222-222222222222",steps[i],i]);
    }
    await db.exec("insert into product_events(journey_id,event,locale,occurred_at,minute_bucket) values ('33333333-3333-3333-3333-333333333333','registration_started','en',now()-interval '4 days',1),('33333333-3333-3333-3333-333333333333','landing_view','en',now()-interval '3 days',2),('44444444-4444-4444-4444-444444444444','chat_completed','en',now()-interval '1 day',1);");
    const result = await db.query<{ s: { steps: { journeys: number; conversionFromPrevious: number | null }[] } }>("select product_analytics_summary(now()-interval '7 days',now()) as s");
    expect(result.rows[0].s.steps.map(s => s.journeys)).toEqual([2,1,1,1,1,1,1]);
    expect(result.rows[0].s.steps[1].conversionFromPrevious).toBe(0.5);
    await db.exec("insert into product_events(journey_id,event,locale,occurred_at,minute_bucket) values ('33333333-3333-3333-3333-333333333333','registration_started','en',now()-interval '1 day',3)");
    const retry = await db.query<{ s: { steps: { journeys: number }[] } }>("select product_analytics_summary(now()-interval '7 days',now()) as s");
    expect(retry.rows[0].s.steps.map(s => s.journeys)).toEqual([2,2,1,1,1,1,1]);
    expect(JSON.stringify(retry.rows)).not.toContain("33333333");
  });
  it("rejects unbounded query periods", async () => {
    await expect(db.query("select product_analytics_summary(now()-interval '365 days',now())")).rejects.toThrow(/Invalid analytics period/);
  });
});
