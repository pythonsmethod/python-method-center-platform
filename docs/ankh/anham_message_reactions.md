# Anham message reactions v1 — 2026-09-18

## A. What existed before

Anham answered every client-route message with prose only. The chat window
(`components/assistant/AssistantChat.tsx`), the read-only saved thread
(`components/assistant/SavedAssistantThread.tsx`) and the history API returned
plain `user` / `assistant` rows from `assistant_messages`. Safety lived in the
prompts (`platformContext` red-flag protocol, `lib/security/ai-policy.ts`), the
provider refusal path (`providerPolicyRefusal`) and the honesty guard
(`guardFactualReply`). There was no structured channel for a reaction and no
place to store one. The `[[action:id]]` marker already existed as the one
server-substituted protocol token in chat replies.

## B. Behavior

Anham may now attach one small emoji reaction to the person's own message, the
way a messenger does, and then answer in words as before. The reaction is a
communication gesture only: it never replaces the reply, never appears inside
the reply text and never widens what any tier of the assistant may do.

Decision flow for one message on `/api/assistant/client`:

1. The system prompt for the client route (all three tiers) receives a
   reaction rule: the model may begin its reply with one line
   `[[reaction:key]]`, using only the eight allowlisted keys, and must not
   react to anything on the no-reaction list. Voice, staff and Professor
   Python prompts do not receive the rule.
2. `extractReactionMarker` removes every marker from the reply, keeps the
   first value only, and passes it through the allowlist. An emoji, HTML,
   an unknown key or a bare `[[reaction]]` becomes `null` and still leaves
   the prose clean.
3. After the honesty guard, `resolveAnhamReaction` applies the policy in
   order: nothing proposed → none; provider refusal → none; guest tier
   outside `heart` / `thanks` / `thumbs_up` → none; the person's message
   matches the safety list → none; the delivered reply invokes the emergency
   protocol, a refusal or an honesty-guard substitution → none.
4. The response carries `reply` and `reaction` (`null` or a key). Registered
   and paid clients get the key stored on their own `user` row.

Allowlist: `heart` ❤️, `clap` 👏, `celebrate` 🥳, `thumbs_up` 👍, `eyes` 👀,
`smile` 😄, `thanks` 🙏, `strength` 💪. The glyphs exist only in
`ANHAM_REACTION_EMOJI`; the API, the database and the model exchange keys.

Safety list (server-side, RU/EN, ё-folded, Cyrillic-aware): pain and acute
symptoms, worsening, breathing, bleeding, loss of consciousness, seizures,
stroke/heart signs, allergy/poisoning, emergency vocabulary and numbers,
medication/dosage/supplement questions, self-harm, emotional crisis and
violence, fear for life, death and loss, diagnosis and serious medical news.
The list is intentionally broad: a missed 👏 costs nothing, a misplaced one
reads as dismissing what the person is going through.

## C. Files

- `lib/assistant/reactions.ts` — allowlist, marker extraction, safety
  classifier, tier policy, prompt rule.
- `app/api/assistant/client/route.ts` — rule appended to the system prompt,
  marker extraction before the honesty guard, resolution after it, `reaction`
  in the response and in persistence.
- `lib/assistant/history.ts` — `reaction` on the saved user row and in every
  history read.
- `components/assistant/AnhamReactionBadge.tsx` — the badge; renders only
  allowlisted keys.
- `components/assistant/AssistantChat.tsx`,
  `components/assistant/SavedAssistantThread.tsx` — badge on user bubbles.
- `app/globals.css` — badge styling; absolute inside the bubble, no layout
  shift, phone-safe.
- `supabase/migrations/20260918120000_anham_message_reactions.sql`
- tests: `tests/anham-message-reactions.test.ts`,
  `tests/anham-message-reactions-route.test.ts`,
  `tests/anham-message-reactions-ui.test.tsx`,
  `tests/anham-message-reactions-sql.test.ts`.

## D. Schema

`assistant_messages.reaction text null` with constraint
`assistant_messages_reaction_allowlist`: `NULL`, or `role = 'user'` and one
of the eight keys. Additive, nullable, no backfill, no RLS change. The
migration must be applied before the code that selects the column is
deployed, as with the earlier `web_results` and `exchange_id` columns.

## E. Tiers

- Guest (Anham Guide): rule tells the model to react very rarely; the server
  additionally restricts to `heart`, `thanks`, `thumbs_up`. Nothing is stored,
  the badge lives only in the open window.
- Registered: full allowlist, stored, shown after reload.
- Paid client: same as registered, including the attachment path (👀 on an
  uploaded document is allowed when the message itself is safe).
- Staff / Karen / founder / Professor Python routes: unchanged; no rule, no
  extraction, no badge.

## F. Verification

Focused suites pass (allowlist, extraction, safety classifier with RU/EN
fixtures per forbidden category, policy order, route integration including
the safety-overrides-reaction regression, badge rendering in RU/EN, saved
thread after reload, CSS placement, PGlite migration idempotence and
constraint). Full regression: 1,944 tests pass with one existing intentional
skip. TypeScript, ESLint, `git diff --check` and the production build pass,
with only the pre-existing Autoprefixer `end` warning.

Release (2026-09-19): the migration was applied to the production Supabase
project as `anham_message_reactions` before the code deploy; the column,
constraint and zero pre-existing reacted rows were verified read-only. PR
#209 passed the `verify` workflow and the three Vercel preview deployments and
merged as `aba191b1`. The primary and clinical production deployments reached
READY; the mobile-app project canceled its build as it does on every `main`
merge. Production checks: `/` returned `200`, `/cabinet/anham` redirected to
login, `/api/assistant/history` returned `401` without a session; Vercel
recorded no runtime errors and no 5xx in the release window. The release
environment's network policy blocked a direct chat request, so no live
reaction was exercised against production during the release itself.

## G. Security and PHI

The classifier reads the person's message only to answer yes/no and keeps
nothing. Reactions are enumerated keys: no free text, no emoji and no HTML
from the model ever reaches the interface or the database. No new
external call, no new provider, no change to authorization, payments,
Case lifecycle, onboarding, knowledge base or medical permissions.

## H. Known limitations and v2

- The model decides the human moment; the server only vetoes. A quiet
  conversation may still get no reaction when one would have been welcome.
- The safety list is pattern-based and conservative; it will suppress
  reactions on some safe messages that mention, for example, a clinic visit.
- Reactions are not shown for voice transcripts.
- No analytics on reaction frequency; no per-person opt-out yet.
