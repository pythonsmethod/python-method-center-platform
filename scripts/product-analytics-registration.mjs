// Local-only continuation for owner-authorized email-confirmed staging signup.
// No user password is read, persisted or logged by this launcher.
import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const url = 'https://atdmzkciqxdgblusbhtr.supabase.co';
const anon = 'sb_publishable_MUbqOci40ka1vMqVVB6d2Q_wwYV_kSA';
const nonce = randomBytes(24).toString('hex');
let child;
let model;
async function serve(config) {
  if (config.url !== url || !config.key.startsWith('sb_secret_')) throw new Error('Staging config required');
  if (fs.existsSync('.env.local')) throw new Error('Refuse implicit deployment credentials');
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/SUPABASE|OPENAI|ANTHROPIC|TELEGRAM|STRIPE|SMTP|POSTHOG|PRODUCT_ANALYTICS|FOUNDER_EMAILS|KAREN_EMAILS/.test(key)) delete env[key];
  Object.assign(env, { NEXT_PUBLIC_SITE_URL: 'http://localhost:3187', NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: config.key, PRODUCT_ANALYTICS_ENABLED: 'true', PRODUCT_ANALYTICS_SECRET: randomBytes(48).toString('hex'), NEXT_PUBLIC_POSTHOG_HEATMAPS_ENABLED: 'false', NEXT_TELEMETRY_DISABLED: '1', ANTHROPIC_API_KEY: 'synthetic-local-only', ANTHROPIC_BASE_URL: 'http://127.0.0.1:3188' });
  model = http.createServer(async (req, res) => {
    // Deliberately discard test conversation text; no real provider calls.
    for await (const chunk of req) {
      void chunk;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: 'msg_staging', type: 'message', role: 'assistant', model: 'test', content: [{ type: 'text', text: 'Тестовый ответ staging. Медицинская интерпретация не выполняется.' }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } }));
  });
  await new Promise(resolve => model.listen(3188, '127.0.0.1', resolve));
  child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3187'], { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  child.stdout.on('data', data => process.stdout.write(data));
  child.stderr.on('data', data => process.stderr.write(data));
}
{
  // One-use loopback form transfers the existing staging key from the owner's
  // dashboard to the local server without printing it into tool output.
  const setup = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'; form-action 'self'; frame-ancestors 'none'");
    if (req.url !== `/${nonce}`) { res.writeHead(404); res.end(); return; }
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<h1>Local staging setup</h1><p>Project: atdmzkciqxdgblusbhtr</p><form method="POST"><label>Existing staging secret<input name="key" type="password" autocomplete="off" required></label><button>Use staging key locally</button></form>'); return;
    }
    if (req.method !== 'POST' || req.headers.origin !== 'http://localhost:3190') { res.writeHead(403); res.end(); return; }
    let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 1000) { res.writeHead(413); res.end(); return; } }
    const key = new URLSearchParams(raw).get('key') ?? '';
    if (!key.startsWith('sb_secret_')) { res.writeHead(400); res.end('Expected staging secret key'); return; }
    const check = await fetch(`${url}/rest/v1/product_events?select=id&limit=0`, { headers: { apikey: key } });
    if (!check.ok) { res.writeHead(403); res.end('Key does not authorize the pinned staging database'); return; }
    const config = { url, anon, key };
    // Keep the privileged key only in this process and its child environment.
    // Never persist a credential file for the owner registration workflow.
    res.end('Staging key verified. Starting local test app.');
    setup.close();
    await serve(config);
  });
  setup.listen(3190, '127.0.0.1', () => console.log(`Local setup: http://localhost:3190/${nonce}`));
}
process.on('SIGINT', () => { child?.kill(); model?.close(); process.exit(0); });
