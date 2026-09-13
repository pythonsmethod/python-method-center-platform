// Explicit, synthetic-only acceptance against the existing isolated branch.
// Supply an ignored JSON config {url, anon, key} in .env.analytics-staging.local.
// Run `node scripts/product-analytics-staging.mjs serve`, then `... verify`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const ref = 'atdmzkciqxdgblusbhtr';
// Next normalizes the internal loopback request URL to localhost.
const origin = 'http://localhost:3187';
const statePath = '.env.analytics-fixtures.local';
const read = path => JSON.parse(fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
const config = read('.env.analytics-staging.local');
assert.equal(config.url, `https://${ref}.supabase.co`, 'Only the isolated staging branch is allowed');
assert.ok(config.key.startsWith('sb_secret_'));
const db = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
const checked = result => { assert.equal(result.error, null, result.error?.message); return result.data; };
const log = (check, extra = {}) => console.log(JSON.stringify({ check, ...extra }));
const mode = process.argv[2];

async function cleanup(state) {
  for (const journey of state.journeys) checked(await db.from('product_events').delete().eq('journey_id', journey));
  for (const user of state.users) checked(await db.auth.admin.deleteUser(user.id));
  for (const user of state.users) {
    const remaining = await db.from('profiles').select('id').eq('id', user.id);
    assert.equal(checked(remaining).length, 0);
  }
  fs.unlinkSync(statePath);
  log('scoped synthetic accounts and journeys removed');
}

if (mode === 'browser-state') {
  const state = read(statePath);
  const cookies = new Map();
  const client = createServerClient(config.url, config.anon, { cookies: {
    getAll: () => [], setAll: values => values.forEach(({ name, value }) => cookies.set(name, value))
  } });
  const user = state.users.find(user => user.role === 'client');
  checked(await client.auth.signInWithPassword({ email: user.email, password: user.password }));
  const response = await fetch(origin + '/api/analytics/consent', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ granted: true }) });
  assert.equal(response.status, 200);
  for (const line of response.headers.getSetCookie()) {
    const pair = line.split(';')[0]; const cut = pair.indexOf('=');
    if (pair.slice(cut + 1)) cookies.set(pair.slice(0, cut), pair.slice(cut + 1));
  }
  state.journeys.push(cookies.get('pm-analytics-journey').split('.')[0]);
  fs.writeFileSync(statePath, JSON.stringify(state));
  fs.writeFileSync('.env.analytics-browser.local', JSON.stringify({ cookies: [...cookies].map(([name, value]) => ({ name, value, domain: 'localhost', path: '/', expires: -1, httpOnly: name.startsWith('pm-analytics'), secure: false, sameSite: 'Lax' })), origins: [] }));
  log('synthetic client browser state saved in ignored local file');
} else if (mode === 'cleanup') {
  await cleanup(read(statePath));
} else if (mode === 'serve') {
  assert.ok(!fs.existsSync(statePath), 'Clean the previous fixture run first');
  assert.ok(!fs.existsSync('.env.local'), 'Refuse implicit local deployment credentials');
  const state = { users: [], journeys: [], prompts: [], startedAt: new Date().toISOString() };
  const save = () => fs.writeFileSync(statePath, JSON.stringify(state));
  save();
  for (const role of ['founder', 'client', 'karen', 'other_admin']) {
    const email = `analytics-${role}-${randomUUID()}@example.invalid`;
    const password = randomBytes(24).toString('base64url');
    const { user } = checked(await db.auth.admin.createUser({ email, password, email_confirm: true }));
    state.users.push({ id: user.id, role, email, password }); save();
    checked(await db.from('profiles').upsert({ id: user.id, email, role: role === 'client' ? 'client' : 'admin', status: role === 'client' ? 'registered' : 'active', locale: 'en' }));
  }
  // Only a local deterministic AI responder. Never send synthetic prompts or credentials to a paid provider.
  const mock = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    const input = JSON.parse(body);
    const current = read(statePath);
    current.prompts.push({ system: input.system });
    fs.writeFileSync(statePath, JSON.stringify(current));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: 'msg_synthetic', type: 'message', role: 'assistant', model: input.model, content: [{ type: 'text', text: 'Synthetic staging response. No clinical interpretation.' }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } }));
  });
  await new Promise(resolve => mock.listen(3188, '127.0.0.1', resolve));
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/SUPABASE|OPENAI|ANTHROPIC|TELEGRAM|STRIPE|SMTP|POSTHOG|PRODUCT_ANALYTICS|FOUNDER_EMAILS|KAREN_EMAILS/.test(key)) delete env[key];
  Object.assign(env, {
    NEXT_PUBLIC_SUPABASE_URL: config.url, NEXT_PUBLIC_SUPABASE_ANON_KEY: config.anon,
    SUPABASE_SERVICE_ROLE_KEY: config.key, PRODUCT_ANALYTICS_ENABLED: 'true',
    PRODUCT_ANALYTICS_SECRET: randomBytes(48).toString('hex'),
    FOUNDER_EMAILS: state.users[0].email, KAREN_EMAILS: state.users[2].email,
    ANTHROPIC_API_KEY: 'synthetic-local-only', ANTHROPIC_BASE_URL: 'http://127.0.0.1:3188',
    NEXT_PUBLIC_POSTHOG_HEATMAPS_ENABLED: 'false', NEXT_TELEMETRY_DISABLED: '1'
  });
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3187'], { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  child.stdout.on('data', chunk => process.stdout.write(chunk));
  child.stderr.on('data', chunk => process.stderr.write(chunk));
  log('local app uses isolated staging; synthetic users created; AI responder local');
  process.on('SIGINT', () => { child.kill(); mock.close(); process.exit(0); });
} else if (mode === 'verify') {
  const state = read(statePath);
  const save = () => fs.writeFileSync(statePath, JSON.stringify(state));
  const jar = new Map();
  const request = async (path, body, cookies = jar, foreign = false) => {
    const response = await fetch(origin + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Origin: foreign ? 'https://invalid.example' : origin, 'Content-Type': 'application/json', Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    for (const line of response.headers.getSetCookie()) {
      const pair = line.split(';')[0]; const cut = pair.indexOf('=');
      cookies.set(pair.slice(0, cut), pair.slice(cut + 1));
    }
    return response;
  };
  const authJar = async user => {
    const cookies = new Map();
    const client = createServerClient(config.url, config.anon, { cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: values => values.forEach(({ name, value }) => cookies.set(name, value))
    } });
    checked(await client.auth.signInWithPassword({ email: user.email, password: user.password }));
    return cookies;
  };
  const emit = event => request('/api/analytics/events', { event, locale: 'en' });
  assert.equal((await emit('landing_view')).status, 202);
  assert.equal((await request('/api/analytics/summary')).status, 403);
  assert.equal((await request('/api/analytics/consent', { granted: true }, jar, true)).status, 403);
  assert.equal((await request('/api/analytics/consent', { granted: true })).status, 200);
  const journey = jar.get('pm-analytics-journey').split('.')[0];
  state.journeys.push(journey); save();
  assert.equal((await emit('landing_view')).status, 204);
  assert.equal((await emit('landing_view')).status, 204);
  assert.equal(checked(await db.from('product_events').select('event').eq('journey_id', journey)).length, 1);
  assert.equal((await emit('registration_started')).status, 204);
  assert.equal((await emit('registration_completed')).status, 400);
  assert.equal((await emit('onboarding_view')).status, 403);
  assert.equal((await request('/api/analytics/events', { event: 'landing_view', locale: 'en', text: 'synthetic forbidden text' })).status, 400);
  log('no consent/no data, foreign origin, deduplication, forged completion and extra fields');
  const cookiesByRole = {};
  for (const user of state.users) {
    const cookies = await authJar(user); cookiesByRole[user.role] = cookies;
    const response = await request('/api/analytics/summary', undefined, cookies);
    assert.equal(response.status, user.role === 'founder' ? 200 : 403);
    assert.match(response.headers.get('cache-control'), /no-store/);
    if (user.role === 'founder') {
      const summary = await response.json();
      assert.equal(summary.current.funnel.status, 'ready');
      assert.ok(summary.current.operational.every(metric => metric.status === 'ready'));
      assert.equal(summary.provider.status, 'not_connected');
      assert.ok(!JSON.stringify(summary).includes(journey));
    }
  }
  log('real Auth + founder allowlist; client, Karen, unlisted admin and anonymous denied');
  for (const [key, value] of cookiesByRole.client) jar.set(key, value);
  assert.equal((await emit('onboarding_view')).status, 204);
  assert.equal((await emit('cabinet_view')).status, 204);
  const chat = await request('/api/assistant/client', { messages: [{ role: 'user', content: 'Synthetic analytics acceptance test.' }], locale: 'en' });
  state.prompts = read(statePath).prompts; save();
  assert.equal(chat.status, 200);
  assert.match(JSON.stringify(await chat.json()), /Synthetic staging response/);
  const events = checked(await db.from('product_events').select('event').eq('journey_id', journey)).map(row => row.event);
  assert.ok(events.includes('chat_completed'));
  log('signed-in views and real chat completion hook; AI transport is a local test double');
  // A separate SQL fixture verifies seven-step ordering, explicitly NOT a signup UI proof.
  const sqlJourney = randomUUID(); state.journeys.push(sqlJourney); save();
  const steps = ['landing_view', 'registration_started', 'registration_completed', 'onboarding_view', 'onboarding_completed', 'cabinet_view', 'chat_completed'];
  for (const event of steps) checked(await db.rpc('record_product_event', { p_journey: sqlJourney, p_event: event, p_locale: 'ru' }));
  // Use the observed database timestamp to avoid workstation/DB clock skew.
  const latest = checked(await db.from('product_events').select('occurred_at').eq('journey_id', sqlJourney).order('occurred_at', { ascending: false }).limit(1))[0].occurred_at;
  const result = checked(await db.rpc('product_analytics_summary', { p_start: state.startedAt, p_end: new Date(new Date(latest).getTime() + 1).toISOString() }));
  assert.ok(result.steps.every(step => step.journeys >= 1));
  const anon = createClient(config.url, config.anon, { auth: { persistSession: false } });
  assert.ok((await anon.from('product_events').select('id')).error);
  assert.ok((await anon.rpc('record_product_event', { p_journey: randomUUID(), p_event: 'landing_view', p_locale: 'en' })).error);
  log('real Supabase gateway ACL and seven-step SQL fixture', { sqlFixtureJourneys: 1 });
  const founderResponse = await request('/api/assistant/staff', { provider: 'claude', messages: [{ role: 'user', content: 'Where do visitors drop off?' }], analytics: { forged: 987654321 } }, cookiesByRole.founder);
  state.prompts = read(statePath).prompts; save();
  assert.equal(founderResponse.status, 200);
  const captured = JSON.stringify(read(statePath).prompts.at(-1).system);
  assert.match(captured, /PRODUCT_ANALYTICS/); assert.match(captured, /consenting_browser_journeys/);
  assert.ok(!captured.includes('987654321')); assert.ok(!captured.includes(journey));
  log('founder prompt receives server aggregates; caller data and journey IDs excluded');
  assert.equal((await request('/api/analytics/consent', { granted: false })).status, 200);
  assert.equal(checked(await db.from('product_events').select('id').eq('journey_id', journey)).length, 0);
  assert.equal((await emit('landing_view')).status, 202);
  log('withdrawal deletes the journey and stops recording');
  log('PASS', { registrationEmailDelivery: 'not tested', signupAndOnboardingBrowserFlow: 'not tested', hostedPreview: 'not deployed', heatmaps: 'disabled' });
} else throw new Error('Expected serve, verify or cleanup');
