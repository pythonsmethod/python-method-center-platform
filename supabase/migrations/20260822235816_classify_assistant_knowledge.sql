alter table public.assistant_knowledge
  add column if not exists collection text not null default 'general';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'assistant_knowledge_collection_check') then
    alter table public.assistant_knowledge add constraint assistant_knowledge_collection_check
      check (collection in ('general', 'book', 'method', 'client_answers'));
  end if;
end $$;

comment on column public.assistant_knowledge.collection is
  'Approved destination: general, private book, shared method, or client-answer memory.';

create index if not exists assistant_knowledge_collection_idx
  on public.assistant_knowledge (collection, is_active, created_at desc);
