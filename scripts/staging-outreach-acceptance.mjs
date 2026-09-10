// Explicit opt-in synthetic acceptance on the existing data-free staging branch.
// Credentials and fixture IDs live only in ignored .env.*.local files.
import fs from "node:fs";
import http from "node:http";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";

const TARGET = "https://atdmzkciqxdgblusbhtr.supabase.co";
const SITE = "http://127.0.0.1:4323";
const FIXTURE = ".env.outreach-fixture.local";
const config = JSON.parse(fs.readFileSync(".env.outreach-staging.local", "utf8"));
if (config.url !== TARGET) throw new Error("Refusing a non-staging target");
const service = createClient(config.url, config.key, { auth: { persistSession: false } });
const mode = process.argv[2];
const check = (result) => { if (result.error) throw new Error(result.error.message); return result.data; };
const readFixture = () => JSON.parse(fs.readFileSync(FIXTURE, "utf8"));

if (mode === "setup") {
  if (fs.existsSync(FIXTURE)) throw new Error("Existing fixture: clean it up before another setup");
  const fixture = { run: randomBytes(5).toString("hex"), users: [], cronSecret: randomBytes(24).toString("hex") };
  const save = () => fs.writeFileSync(FIXTURE, JSON.stringify(fixture));
  save();
  for (const alias of ["client", "admin"]) {
    const email = `outreach-${fixture.run}-${alias}@example.invalid`;
    const password = randomBytes(24).toString("base64url");
    const { user } = check(await service.auth.admin.createUser({ email, password, email_confirm: true,
      app_metadata: { synthetic_outreach_run: fixture.run } }));
    fixture.users.push({ alias, id: user.id, email, password }); save();
    check(await service.from("profiles").upsert({ id: user.id, email, full_name: `Synthetic outreach ${alias}`,
      role: alias === "admin" ? "admin" : "client", status: "active", locale: "ru" }));
  }
  const client = fixture.users.find((u) => u.alias === "client");
  const caseRow = check(await service.from("client_cases").insert({ profile_id: client.id,
    title: "Synthetic outreach acceptance" }).select("id").single());
  fixture.caseId = caseRow.id; save();
  console.log(JSON.stringify({ stage: "fixture-ready", clientId: client.id, caseId: caseRow.id }));
} else if (mode === "start") {
  const fixture = readFixture();
  const client = fixture.users.find((u) => u.alias === "client");
  const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: TARGET,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: config.anon, SUPABASE_SERVICE_ROLE_KEY: config.key,
    NEXT_PUBLIC_SITE_URL: SITE, ASSISTANT_OUTREACH_ENABLED: "true",
    ASSISTANT_OUTREACH_PROFILE_IDS: client.id, CRON_SECRET: fixture.cronSecret };
  // No external model, notification or payment provider may be used by this run.
  for (const key of Object.keys(env)) if (/ANTHROPIC|OPENAI|TELEGRAM|RESEND|STRIPE|GOOGLE_APPLICATION/.test(key)) delete env[key];
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "4323"],
    { env, stdio: ["ignore", "inherit", "inherit"], windowsHide: true });
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
        res.end(`<title>Outreach staging acceptance</title><h1>Synthetic outreach accounts</h1>
          <p>Existing staging branch only. No real clients.</p>
          ${fixture.users.map((u) => `<form method="post" action="/login/${u.alias}"><button>Sign in as ${u.alias}</button></form>`).join("")}`);
        return;
      }
      const match = req.url?.match(/^\/login\/(client|admin)$/);
      if (req.method === "POST" && match) {
        if (req.headers.origin !== "http://127.0.0.1:4322") { res.writeHead(403); res.end(); return; }
        const account = fixture.users.find((u) => u.alias === match[1]);
        const cookies = [];
        const auth = createServerClient(TARGET, config.anon, { cookies: {
          getAll: () => parseCookieHeader(req.headers.cookie ?? "").map(({ name, value }) => ({ name, value: value ?? "" })),
          setAll: (values) => cookies.push(...values)
        } });
        check(await auth.auth.signInWithPassword({ email: account.email, password: account.password }));
        res.setHeader("Set-Cookie", cookies.map(({ name, value, options }) => serializeCookieHeader(name, value, options)));
        res.writeHead(303, { Location: `${SITE}${account.alias === "client" ? "/cabinet/chat" : `/admin/cases/${fixture.caseId}`}` });
        res.end(); return;
      }
      res.writeHead(404); res.end();
    } catch { res.writeHead(503); res.end("Synthetic sign-in failed"); }
  });
  server.listen(4322, "127.0.0.1", () => console.log("Synthetic sign-in: http://127.0.0.1:4322"));
  const close = () => { child.kill(); server.close(); };
  process.on("SIGINT", close); process.on("SIGTERM", close);
  child.on("exit", () => server.close());
} else if (mode === "check") {
  const fixture = readFixture();
  const client = fixture.users.find((u) => u.alias === "client");
  const delay = Number(process.argv[3] ?? 0);
  if (!Number.isInteger(delay) || delay < 0 || delay > 30000) throw new Error("Invalid test delay");
  if (delay) { console.log("Concurrent HTTP check armed"); await new Promise((resolve) => setTimeout(resolve, delay)); }
  const cron = async () => {
    const start = Date.now();
    const r = await fetch(`${SITE}/api/cron/assistant-outreach`, { headers: { authorization: `Bearer ${fixture.cronSecret}` } });
    return { status: r.status, ...await r.json(), durationMs: Date.now() - start };
  };
  const before = check(await service.from("assistant_messages").select("id").eq("profile_id", client.id));
  const results = await Promise.all([cron(), cron()]);
  const rows = check(await service.from("assistant_messages").select("id,outreach_number").eq("profile_id", client.id));
  const state = check(await service.from("assistant_outreach_state").select("opted_out,last_sent_at,delivered_count").eq("profile_id", client.id).single());
  console.log(JSON.stringify({ results, before: before.length, rows, state }));
} else if (mode === "cleanup") {
  const fixture = readFixture();
  for (const expected of fixture.users) {
    const { user } = check(await service.auth.admin.getUserById(expected.id));
    if (user.email !== expected.email || user.app_metadata?.synthetic_outreach_run !== fixture.run) throw new Error("Fixture ownership mismatch");
    // Explicitly remove our Case first: avoid unrelated restrictive downstream FKs.
    if (expected.alias === "client" && fixture.caseId) check(await service.from("client_cases").delete().eq("id", fixture.caseId).eq("profile_id", expected.id));
    check(await service.auth.admin.deleteUser(expected.id));
  }
  fs.unlinkSync(FIXTURE);
  fs.unlinkSync(".env.outreach-staging.local");
  console.log("Only this run's synthetic accounts and local credentials removed.");
} else throw new Error("Use setup, start, check or cleanup");
