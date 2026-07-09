# Deployment Plan

This document covers deployment preparation for the new
`python-method-center-platform` Next.js application.

## Scope

- Deploy the new Next.js platform only.
- Do not modify, redeploy, or repoint the archived Python Railway app.
- Do not mix `python-method-center` with `python-method-center-platform`.
- Do not add product features during deployment.
- Do not add AI, OCR, Karen workflow, medical interpretation, routing, or
  recommendation logic as part of deployment.

## Recommended Target

Use Vercel for the Next.js platform.

Reasons:

- The platform is a standard Next.js App Router application.
- Vercel supports Next.js with zero-configuration framework detection.
- Vercel handles dynamic server-rendered routes and route handlers needed by
  Supabase Auth and staff document access.
- Railway remains acceptable only as a separate new Next.js service, not by
  reusing the archived Python app service.

## Required Environment Variables

Set these in the hosting provider's project environment settings:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Optional (payment buttons on `/payment` stay hidden until these are set):

```text
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_5W
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_15W
```

Recommended after the production domain is selected:

```text
NEXT_PUBLIC_SITE_URL=https://pythonmethodcenter.com
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never prefix it with
`NEXT_PUBLIC_`, never expose it in browser code, and never commit it to the
repository.

## Supabase Auth Redirect URLs

Before final production verification, configure Supabase Auth with the deployed
site URLs.

For the Vercel preview or production URL:

```text
https://<vercel-project-domain>/auth/callback
```

For the production domain:

```text
https://pythonmethodcenter.com/auth/callback
https://www.pythonmethodcenter.com/auth/callback
```

Also set the Supabase Site URL to the active production site:

```text
https://pythonmethodcenter.com
```

## Domain Strategy

- Keep the old Railway URL archived:
  `https://python-method-center-production-24ec.up.railway.app/`
- Do not point `pythonmethodcenter.com` at the old Railway Python app.
- Point `pythonmethodcenter.com` at the new Vercel Next.js platform after
  deployment approval.
- Add both `pythonmethodcenter.com` and `www.pythonmethodcenter.com` in the
  Vercel project domain settings.
- In Namecheap DNS, use the exact records shown by Vercel. Typically:
  - apex/root domain uses an `A` record;
  - `www` uses a `CNAME` record.

## Deployment Steps

1. Create a new Vercel project from
   `pythonsmethod/python-method-center-platform`.
2. Use the repo root as the project root.
3. Confirm the framework preset is Next.js.
4. Add all required environment variables.
5. Deploy a preview or production build.
6. Add the deployed callback URL to Supabase Auth settings.
7. Verify authentication.
8. Verify onboarding creates a client case.
9. Verify client document upload.
10. Verify staff/admin access to `/admin`.
11. Verify staff/admin access to `/admin/documents`.
12. Verify staff document open uses a short-lived signed URL.
13. Add `pythonmethodcenter.com` to Vercel.
14. Update Namecheap DNS using Vercel's shown records.
15. Add the final domain redirect URLs to Supabase Auth.
16. Re-run the full production smoke test.

## Verification Checklist

Run these checks after deployment:

- `/login` renders.
- Sign-up and sign-in work with Supabase Auth.
- `/onboarding` requires authentication.
- Onboarding creates or updates:
  - `profiles`
  - `client_cases`
  - `onboarding_submissions`
  - `consent_records`
- `/cabinet` shows the client case shell.
- Client document upload stores files in `client-documents`.
- Client document upload creates `uploaded_documents` metadata.
- `/admin` denies ordinary clients.
- `/admin` allows active `support` or `admin` profiles.
- `/admin/documents` lists uploaded document metadata for staff/admin.
- `/admin/cases` lists client cases; a case page shows the onboarding payload.
- `/admin/requests` lists client support requests with status controls.
- `/legal/offer` serves the published offer PDF.
- Onboarding requires both offer acceptance and data-processing consent and
  writes `offer_acceptance` + `data_processing` consent records.
- Cabinet "Написать команде" creates a `support_requests` row.
- `/payment` shows Stripe Payment Link buttons when the env vars are set.
- Document `Open` redirects through a short-lived signed URL.
- Anonymous/public exact-path document access remains denied.
- No public document URLs are used.

## Security Notes

- Keep `client-documents` private.
- Keep Storage RLS scoped to the authenticated user's path for client access.
- Use service-role access only from server-side code.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client components, browser code,
  logs, screenshots, or repository files.
- Do not create public URLs for client documents.
- Staff document open should continue to use short-lived signed URLs.

## Manual Work

These steps should be done manually by the project owner or an authorized
operator:

- Create the Vercel project.
- Enter environment variables.
- Add the production domain.
- Update Namecheap DNS records.
- Update Supabase Auth redirect URLs.
- Create or confirm at least one active `support` or `admin` profile.

## Repository Work Before Deployment

- Keep `package-lock.json` committed for reproducible npm installs.
- Keep `.env.local` ignored.
- Do not commit secrets.
- Do not add deployment config unless a hosting provider requires it.
