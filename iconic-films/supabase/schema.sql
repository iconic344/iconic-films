-- Run once in your NEW Supabase project's SQL Editor.
-- Do not run this against the original ChatGPT Site.
create table if not exists public.iconic_settings (key text primary key, value jsonb not null);
create table if not exists public.iconic_sessions (token text primary key, expires bigint not null);
create table if not exists public.iconic_attempts (key text primary key, count integer not null, until bigint not null);
alter table public.iconic_settings enable row level security;
alter table public.iconic_sessions enable row level security;
alter table public.iconic_attempts enable row level security;
revoke all on public.iconic_settings, public.iconic_sessions, public.iconic_attempts from anon, authenticated;
grant all on public.iconic_settings, public.iconic_sessions, public.iconic_attempts to service_role;

create or replace function public.iconic_failed_attempt(p_key text) returns void
language plpgsql security definer set search_path = public as $$
declare now_ms bigint := (extract(epoch from clock_timestamp())*1000)::bigint;
begin
  delete from iconic_attempts where until < now_ms;
  insert into iconic_attempts(key,count,until) values(p_key,1,now_ms+600000)
  on conflict(key) do update set count=case when iconic_attempts.until<now_ms then 1 else iconic_attempts.count+1 end, until=now_ms+600000;
end $$;

create or replace function public.iconic_reset_pin(p_hash text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into iconic_settings(key,value) values('pin',to_jsonb(p_hash)) on conflict(key) do update set value=excluded.value;
  delete from iconic_sessions;
end $$;
revoke all on function public.iconic_failed_attempt(text), public.iconic_reset_pin(text) from public, anon, authenticated;
grant execute on function public.iconic_failed_attempt(text), public.iconic_reset_pin(text) to service_role;

-- Bucket-level cap; also set the project's global Storage upload limit to 100 MB.
-- The available global limit depends on your Supabase plan.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('iconic-media','iconic-media',true,104857600,array[
  'image/*','audio/*','video/*','model/gltf-binary','model/gltf+json'
]) on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- No public write policy. Only the server may issue signed upload URLs.
