import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("mobile app has its own package and never imports the website", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.equal(packageJson.name, "anham-mobile-app");
  assert.doesNotMatch(page, /interface-preview|site-preview|CabinetShell/);
});

test("Russian and English are both complete in the app copy", async () => {
  const copy = await readFile(new URL("../lib/design-model.ts", import.meta.url), "utf8");
  assert.match(copy, /ru:\s*{/);
  assert.match(copy, /en:\s*{/);
  assert.doesNotMatch(copy, /Karen|Карен/i);
});
