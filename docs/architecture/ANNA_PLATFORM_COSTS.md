# Anna-only platform costs

Date: 2026-09-13

## Boundary

`/admin/costs` is visible and accessible only when the authenticated staff user
is an admin and the server-verified email equals the primary platform creator
Anna. Additional founder allowlist entries, Karen and client accounts do not see
the navigation item and receive not-found at the page boundary.

## Current accounting coverage

The page lists every current external cost center in one table:

- OpenAI GPT-Live-1;
- OpenAI text/reasoning;
- Anthropic Claude;
- OpenAI web search;
- Google Document AI;
- Vercel hosting;
- Supabase database/storage;
- Stripe processing fees.

GPT-Live is currently the only monetary total derived from stored provider usage.
The existing `assistant.live.ended` audit event supplies seconds, estimated USD
and whether final usage was confirmed. The dashboard aggregates the last 30 days
and shows individual recent sessions.

Web searches and completed document jobs show activity counts only. Text-model
tokens, provider invoices, Vercel/Supabase bills and Stripe balance fees are not
available in the repository today. They remain `null` and render as “billing data
unavailable”; they are excluded from the displayed verified minimum. Revenue is
never counted as expense. The system does not infer prices from operation counts.

## Data and security

The page is a Server Component and reads with the existing Supabase service
client after the Anna-only guard. No browser API endpoint, public route, schema,
grant or credential exposure is added. Audit metadata contains usage numbers and
technical IDs only; the cost table does not read conversation text, client audio
or clinical data.

## Next accounting integrations

Exact all-platform total requires first-party billing/usage feeds for OpenAI text,
Anthropic, Google Cloud, Vercel, Supabase and Stripe balance transactions. Each
integration must retain server-side credentials, store provider-attested units
and invoice currency, and distinguish estimates from finalized charges.
