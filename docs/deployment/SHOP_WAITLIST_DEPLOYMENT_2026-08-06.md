# Deployment note — the shop's waiting list

One migration has to be applied by hand before the shop's waiting list can
store anything. Until it is, the form still works and nothing is lost, but
the list lives only in Telegram.

## The migration

`supabase/migrations/20260806090000_shop_waitlist.sql`

Creates `public.shop_waitlist` — email, product identifier, optional
profile, language, timestamp — with RLS enabled and no policies, so only
the service role can read or write it.

## How to apply

1. Supabase dashboard → the production project → **SQL Editor**.
2. Paste the whole file and run it. It is idempotent
   (`create table if not exists`, `create index if not exists`), so running
   it twice is harmless.
3. Check it landed:

   ```sql
   select count(*) from public.shop_waitlist;
   ```

   `0` is the expected answer. An error means it did not apply.

## What happens if it is not applied

The action was written so that this is a degradation, not a failure:

- the insert fails;
- the team alert is sent anyway, and the person's email is inside it;
- the visitor is told they are on the list, because they are — the team
  has their address;
- the alert carries the line **«ВНИМАНИЕ: запись в базу не прошла — email
  есть только в этом сообщении»**, so nobody assumes the table has it.

Only if both the table and the Telegram alert fail does the visitor see an
error, and then it is true.

If you see that warning line in Telegram, the migration has not been
applied.

## Verifying after it is applied

1. Open `/shop`, press **«Сообщить, когда выйдет»** on any product.
2. Submit a test address.
3. Expected: the form is replaced by the confirmation, a Telegram alert
   arrives saying **«Запись сохранена в shop_waitlist»**, and

   ```sql
   select email, item_id, locale, created_at from public.shop_waitlist
   order by created_at desc limit 5;
   ```

   shows the row.
4. Submit the same address for the same product again. Expected: the
   confirmation says you are already on the list, and no second row and no
   second alert appear.

## Reading the list when the line launches

```sql
select item_id, locale, count(*), min(created_at) as first_asked
from public.shop_waitlist
group by item_id, locale
order by count(*) desc;
```

Addresses for one product, in the language they were reading in:

```sql
select email from public.shop_waitlist
where item_id = 'formula' and locale = 'ru';
```

`item_id` is null for people who asked about the whole line.

## When the first product actually goes on sale

Three things move together, and none of them should move alone:

1. In `lib/shop/catalog.ts`, the item's `status` becomes `"available"`, and
   a price and a payment link join it.
2. In `app/(public)/shop/page.tsx`, drop the `robots` block from
   `generateMetadata` — the page is only kept out of search because it
   cannot sell.
3. In `app/sitemap.ts`, put `/shop` back.

A test pins the first of these: `tests/shop-waitlist.test.ts` fails if
anything is marked `available`, so the status cannot be flipped without the
change being noticed.
