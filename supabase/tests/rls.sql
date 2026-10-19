-- Run only in a dedicated test project AFTER the migration. Rolls back all test data.
begin;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-0000000000a1','brujula-test-a@example.invalid'),
 ('00000000-0000-4000-8000-0000000000b2','brujula-test-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}',true);
select public.brujula_save('{"tasks":[],"events":[],"inbox":[],"projects":[],"sales":[],"money":[]}',0);
do $$ begin
 if (select count(*) from public.brujula_documents)<>1 then raise exception 'A cannot read own data';end if;
 begin
  perform public.brujula_save('{"tasks":[],"events":[],"inbox":[],"projects":[],"sales":[],"money":[]}',0);
  raise exception 'Expected conflict was not raised';
 exception when serialization_failure then null;
 end;
 begin
  update public.brujula_documents set version=99;
  raise exception 'Direct update unexpectedly allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.brujula_documents)<>0 then raise exception 'B read data owned by A';end if;
end $$;
select public.brujula_save('{"tasks":[],"events":[],"inbox":[],"projects":[],"sales":[],"money":[]}',0);
do $$ begin
 if (select count(*) from public.brujula_documents)<>1 then raise exception 'B isolation failed';end if;
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
 begin
  perform * from public.brujula_documents;
  raise exception 'Anonymous read unexpectedly allowed';
 exception when insufficient_privilege then null;
 end;
 begin
  perform public.brujula_save('{"tasks":[]}',0);
  raise exception 'Anonymous write unexpectedly allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
rollback;
