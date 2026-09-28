# PMC document chain: focus-group rollout

The new reader uses the existing Cases, documents, review, and message tables.
Only an explicitly enrolled Case uses the new parser and the new internal
review. The allowlist starts empty. Other Cases continue the previous reader,
picture, review, and Karen actions. Neither parser publishes a clinical result
automatically.

## Release order

1. Apply the four `20260924*_pmc_document_chain*.sql` migrations in order.
   The source-boundary file defers authenticated metadata restrictions so the
   currently deployed upload action continues to work.
2. Apply `20260928200008_pmc_document_chain_focus_pilot.sql`. Confirm the
   allowlist count is zero and the browser roles cannot execute either claim
   function. Existing deployed cron now excludes any subsequently enrolled
   Case.
3. Deploy this code to the live PMC site. Verify the live revision, a public
   page, the sign-in page, and a staff Case route. Confirm a nonpilot Case still
   displays its previous picture and review. Do not use real source files as
   a deploy smoke test.
4. Apply `20260928200100_pmc_document_server_metadata_boundary.sql` after the
   new server registration action is live. This prevents direct authenticated
   document metadata writes; storage originals are still case-scoped.
5. Enrol only exact, confirmed focus-group Case IDs. Do not infer membership
   from dates, names, Case number ranges, or a document count. The trigger
   refuses activation while an old worker has an active lease. Test one Case
   at a time with Karen reviewing the source and every uncertain reading.

An operator can enable a confirmed Case with a service-role database session:

```sql
insert into public.pmc_document_chain_pilot_cases(case_id,enabled)
values ('<confirmed-case-uuid>'::uuid,true)
on conflict (case_id) do update set enabled=true;
```

For an immediate processing pause, set `enabled=false`. Keep the membership
row: a paused Case is excluded from both workers. If the web code must be
rolled back, first remove the two restrictive `uploaded_documents` metadata
policies from the final migration; the previous upload action needs direct
authenticated inserts and updates. Keep the pilot membership rows in place
until all new jobs and review decisions are assessed.

## Acceptance record

The isolated staging transaction in
`tests/sql/pmc-document-chain-staging-smoke.sql` covers registration, source
snapshot, scoped claim, retry reconciliation, Karen approval, and linked
publication. It rolls back the entirely synthetic Case. This does not replace
Karen's visual comparison with real source pages or her decision on client
wording. Record each real Case's source coverage, disputed rows, queue status,
review decision, and any publication separately without copying PHI to logs.
