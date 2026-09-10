// Local-only synthetic provider for browser acceptance of the real Next route.
// No API keys, database, auth bypass, network model call or persistent messages.
import http from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
for (const filename of [".env", ".env.local", ".env.development", ".env.development.local"]) {
  if (existsSync(resolve(root, filename))) throw new Error(`Remove the local test environment conflict before acceptance: ${filename}`);
}
const appPort = 3219;
const providerPort = 3220;
const reportPath = resolve(root, "output/anham-style-acceptance/provider-checks.json");
const checks = [];
const replies = {
  ru: "## Посмотрим спокойно\n\n**В синтетическом примере указано:** <3,2 мМЕ/л, референс 0,4–4,0, дата 09.09.2026.\n\n- Это данные примера — не вывод о состоянии человека.\n- Для решения по состоянию нужен разбор Professor Python.\n\n[Открыть кабинет](/cabinet?sample=3.2#documents)",
  en: "## Let us look calmly\n\n**The synthetic example records:** <3.2 mIU/L, reference 0.4–4.0, date 09.09.2026.\n\n- These are example data — not a conclusion about a person's health.\n- A health decision needs Professor Python's review.\n\n[Open the cabinet](/cabinet?sample=3.2#documents)"
};
const server = http.createServer(async (request, response) => {
  if (request.url !== "/v1/messages" || request.method !== "POST") {
    response.writeHead(404).end(); return;
  }
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 200_000) { response.writeHead(413).end(); return; }
  }
  try {
    const body = JSON.parse(raw);
    const system = typeof body.system === "string" ? body.system : body.system.map((part) => part.text).join("\n");
    const locale = system.includes("Active interface language: English. Reply in English.") ? "en" : "ru";
    const stylePresent = system.includes("Единый стиль ответов Анхама / Anham response style.");
    checks.push({ sequence: checks.length + 1, locale, stylePresent, synthetic: true });
    mkdirSync(resolve(root, "output/anham-style-acceptance"), { recursive: true });
    writeFileSync(reportPath, JSON.stringify({ provider: "loopback fixture, not a live model", checks }, null, 2) + "\n");
    if (!stylePresent) { response.writeHead(400).end(); return; }
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ id: "synthetic-acceptance", type: "message", role: "assistant", model: body.model,
      content: [{ type: "text", text: replies[locale] }], stop_reason: "end_turn", stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 }
    }));
  } catch { response.writeHead(400).end(); }
});
await new Promise((ready) => server.listen(providerPort, "127.0.0.1", ready));
// An allowlist prevents inherited database, payment and provider credentials.
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
  /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE)$/i.test(name)));
Object.assign(env, { ANTHROPIC_API_KEY: "synthetic-local-only", ANTHROPIC_BASE_URL: `http://127.0.0.1:${providerPort}`,
  NEXT_TELEMETRY_DISABLED: "1", PUBLIC_ASSISTANT_MODE: "open" });
const next = spawn(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", "localhost", "--port", String(appPort)],
  { cwd: root, env, stdio: "inherit", windowsHide: true });
let closing = false;
const close = () => {
  if (closing) return;
  closing = true;
  // Next's development worker is a child process; close only our own tree.
  if (process.platform === "win32" && next.pid) {
    spawn("taskkill", ["/PID", String(next.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  } else next.kill();
  server.close();
};
process.on("SIGINT", close);
process.on("SIGTERM", close);
next.on("exit", () => { server.close(); });
console.log(`Synthetic acceptance only: http://localhost:${appPort}. No database or real model credentials loaded.`);
