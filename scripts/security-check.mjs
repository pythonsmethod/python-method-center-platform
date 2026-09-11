import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import ts from "typescript";

// Reviewed network boundaries, not a list of providers whose APIs may be called anywhere.
const fetchSites = {
  "lib/security/ai-transport.ts": 1,
  "components/assistant/AssistantOutreachPreference.tsx": 2,
  "components/assistant/AssistantChat.tsx": 4,
  "components/assistant/RealtimeVoice.tsx": 1,
  "components/assistant/VoicePicker.tsx": 2,
  "components/cabinet/AnhamChess.tsx": 4,
  "components/cabinet/OnlineChessWithKaren.tsx": 2,
  "components/cabinet/MetricsUpload.tsx": 1,
  "components/cabinet/SupplementAiImport.tsx": 1,
  "components/messages/CaseMessageThread.tsx": 1,
  "components/messages/VoiceRecorder.tsx": 1,
  "lib/assistant/realtime-browser.ts": 3,
  "lib/assistant/live-browser.ts": 1,
  "lib/notifications/guest-support-email.ts": 1,
  "lib/notifications/test-action.ts": 1,
  "lib/notifications/telegram.ts": 1,
  "lib/medical-digest/digest.ts": 1,
  "lib/document-extraction/google-document-ai.ts": 3, // OCR adapter, including fetch type references.
  "app/(admin)/admin/cases/[caseId]/IdentityReviewForm.tsx": 1,
  "app/(admin)/admin/cases/[caseId]/ReprocessCaseDocumentsForm.tsx": 1,
  "app/(client)/cabinet/DocumentUploadPanel.tsx": 1,
};
const dynamicImports = {
  "lib/assistant/conversation-archive.ts": ["./client-case-tools", "./realtime-server", "./voice-web-search"],
  "lib/assistant/voice-text-bridge.ts": ["@/lib/supabase/service"],
};
function inspect(name, source) {
  const errors = [];
  const tree = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, name.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let fetches = 0;
  function walk(node) {
    if (ts.isIdentifier(node) && node.text === "fetch") fetches++;
    if (ts.isElementAccessExpression(node) && node.argumentExpression && ts.isStringLiteral(node.argumentExpression) && node.argumentExpression.text === "fetch") fetches++;
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const pkg = node.moduleSpecifier.text;
      if (/^(ws$|openai|@anthropic-ai\/sdk|@ai-sdk\/|ai$|axios|undici|node:https?$|https?$|node:child_process$|child_process$)/.test(pkg)
          && !(name === "lib/assistant/claude.ts" && pkg === "@anthropic-ai/sdk") && !(name === "lib/security/ai-transport.ts" && pkg === "ws")) errors.push(`${name}: unreviewed network/SDK/execution import ${pkg}`);
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ["eval", "require"].includes(node.expression.text)) errors.push(`${name}: unreviewed dynamic execution/import`);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const target = node.arguments[0];
      if (!target || !ts.isStringLiteral(target) || !dynamicImports[name]?.includes(target.text)) errors.push(`${name}: dynamic import needs security review`);
    }
    ts.forEachChild(node, walk);
  }
  walk(tree);
  if (fetches !== (fetchSites[name] ?? 0)) errors.push(`${name}: raw fetch references changed (${fetches}); use the approved AI transport or review the network boundary`);
  return errors;
}

if (process.argv.includes("--self-test")) {
  assert.ok(inspect("lib/new-ai.ts", "fetch(url)").length);
  assert.ok(inspect("lib/new-ai.ts", "globalThis.fetch(url)").length);
  assert.ok(inspect("lib/new-ai.ts", 'globalThis["fetch"](url)').length);
  assert.ok(inspect("lib/new-ai.ts", 'import OpenAI from "openai"').length);
  assert.ok(inspect("lib/new-ai.ts", 'import("openai")').length);
  assert.equal(inspect("lib/new-ai.ts", 'import { aiFetch } from "@/lib/security/ai-transport"; aiFetch(url, init);').length, 0);
  console.log("Security checker self-test: 6 passed");
} else {
  const root = process.cwd();
  const routes = new Set(JSON.parse(fs.readFileSync(path.join(root, "config/security/existing-api-routes.json"), "utf8").replace(/^\uFEFF/, "")));
  const errors = [];
  function scan(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
        const name = path.relative(root, full).replaceAll("\\", "/");
        errors.push(...inspect(name, fs.readFileSync(full, "utf8")));
        if (/^app\/api\/.*\/route\.[tj]s$/.test(name) && !routes.has(name)) errors.push(`${name}: new API route requires an authorization/ownership/CSRF/body-limit test and inventory review`);
      }
    }
  }
  for (const directory of ["app", "lib", "backend", "ai", "components"]) scan(path.join(root, directory));
  if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
  else console.log("Security boundary inventory: pass");
}
