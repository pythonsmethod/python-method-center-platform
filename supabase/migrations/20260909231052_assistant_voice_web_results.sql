-- Retrieved public-source excerpts remain unverified conversation context.
-- Existing assistant_messages RLS and conversation ownership remain authoritative.
alter table public.assistant_messages add column if not exists web_results jsonb not null default '[]'::jsonb;
alter table public.assistant_messages add constraint assistant_messages_web_results_array check (jsonb_typeof(web_results) = 'array' and jsonb_array_length(web_results) <= 3);
comment on column public.assistant_messages.web_results is 'Server-attested web excerpts with inline citation offsets; not verified clinical evidence.';
