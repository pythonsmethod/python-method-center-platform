# Supabase Storage Manual Setup

Use these steps when the Supabase SQL Editor cannot create or drop policies on
`storage.objects` because the SQL Editor role is not the owner of that table.

## Bucket

1. Open Supabase Dashboard.
2. Go to Storage.
3. Create a new bucket.
4. Set bucket name/id to `client-documents`.
5. Keep the bucket private. Do not enable public access.
6. Set a file size limit of `52428800` bytes, if the dashboard shows that
   option.
7. Allow these MIME types, if the dashboard shows that option:
   - `application/pdf`
   - `image/jpeg`
   - `image/png`
   - `image/webp`
   - `text/plain`

## Object Path Convention

Store client document objects inside the `client-documents` bucket with this
object name pattern:

```text
{user_id}/{case_id}/{filename}
```

The full storage path is:

```text
client-documents/{user_id}/{case_id}/{filename}
```

`{user_id}` must be the authenticated user's `auth.uid()`, and `{case_id}` must
belong to that user in `public.client_cases`.

## Policies

Create custom policies for `storage.objects` through the Supabase Dashboard
policy UI. Use role `authenticated` only. Do not create `anon`, `public`, or
`true` policies for this bucket.

### Select Own Client Documents

Policy name:

```text
client_documents_select_own
```

Operation:

```text
SELECT
```

USING expression:

```sql
bucket_id = 'client-documents'
and public.is_client_document_path_owner(name)
```

### Insert Own Client Documents

Policy name:

```text
client_documents_insert_own
```

Operation:

```text
INSERT
```

WITH CHECK expression:

```sql
bucket_id = 'client-documents'
and public.is_client_document_path_owner(name)
```

### Update Own Client Documents

Policy name:

```text
client_documents_update_own
```

Operation:

```text
UPDATE
```

USING expression:

```sql
bucket_id = 'client-documents'
and public.is_client_document_path_owner(name)
```

WITH CHECK expression:

```sql
bucket_id = 'client-documents'
and public.is_client_document_path_owner(name)
```

### Delete Own Client Documents

Policy name:

```text
client_documents_delete_own
```

Operation:

```text
DELETE
```

USING expression:

```sql
bucket_id = 'client-documents'
and public.is_client_document_path_owner(name)
```

## Verification

Run this in SQL Editor to verify the bucket is private:

```sql
select id, name, public
from storage.buckets
where id = 'client-documents';
```

Run this in SQL Editor to verify the policies exist:

```sql
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname in (
    'client_documents_select_own',
    'client_documents_insert_own',
    'client_documents_update_own',
    'client_documents_delete_own'
  )
order by policyname;
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. Do not use
`NEXT_PUBLIC_` for service-role credentials.
