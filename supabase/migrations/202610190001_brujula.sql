-- Run once in a dedicated Supabase FREE project. No credentials or personal data.
begin;
create table public.brujula_documents (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null,
 version bigint not null default 1 check(version > 0),
 updated_at timestamptz not null default now(),
 constraint brujula_payload_shape check (
  jsonb_typeof(payload)='object' and
  jsonb_typeof(payload->'tasks')='array' and jsonb_typeof(payload->'events')='array' and
  jsonb_typeof(payload->'inbox')='array' and jsonb_typeof(payload->'projects')='array' and
  jsonb_typeof(payload->'sales')='array' and jsonb_typeof(payload->'money')='array'
 )
);
alter table public.brujula_documents enable row level security;
alter table public.brujula_documents force row level security;
revoke all on public.brujula_documents from anon, authenticated;
grant select on public.brujula_documents to authenticated;
create policy brujula_read_own on public.brujula_documents for select to authenticated
 using ((select auth.uid())=user_id);

-- All writes use compare-and-swap. No caller can provide another user's id.
create function public.brujula_save(p_payload jsonb,p_expected_version bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); new_version bigint;
begin
 if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>3000000
 or not (p_payload ?& array['tasks','events','inbox','projects','sales','money'])
 or exists(select 1 from jsonb_each(p_payload) e where e.key not in ('tasks','events','inbox','projects','sales','money') or jsonb_typeof(e.value)<>'array')
 then raise exception 'Invalid payload' using errcode='22023'; end if;
 if p_expected_version=0 then
  insert into public.brujula_documents(user_id,payload,version) values(actor,p_payload,1)
  on conflict(user_id) do nothing returning version into new_version;
 else
  update public.brujula_documents set payload=p_payload,version=version+1,updated_at=now()
  where user_id=actor and version=p_expected_version returning version into new_version;
 end if;
 if new_version is null then raise exception 'BRUJULA_CONFLICT' using errcode='40001'; end if;
 return new_version;
end;
$$;
revoke all on function public.brujula_save(jsonb,bigint) from public,anon;
grant execute on function public.brujula_save(jsonb,bigint) to authenticated;
commit;
