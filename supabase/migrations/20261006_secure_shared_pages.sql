create extension if not exists pgcrypto;

alter table public.shared_pages
  add column if not exists edit_token_hash text,
  add column if not exists revoked_at timestamptz;

create or replace function public.create_shared_page_secure(
  p_id text, p_data jsonb, p_edit_token text
) returns void
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  if char_length(p_id) < 12 or char_length(p_id) > 32 then raise exception 'invalid id'; end if;
  if p_edit_token !~ '^[0-9a-f]{64}$' then raise exception 'invalid edit token'; end if;
  if pg_column_size(p_data) > 262144 then raise exception 'data too large'; end if;
  insert into public.shared_pages(id, data, edit_token_hash)
  values (p_id, p_data, encode(digest(p_edit_token, 'sha256'), 'hex'));
end;
$$;

create or replace function public.claim_shared_page(
  p_id text, p_edit_token text
) returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare v_hash text;
begin
  if p_edit_token !~ '^[0-9a-f]{64}$' then raise exception 'invalid edit token'; end if;
  v_hash := encode(digest(p_edit_token, 'sha256'), 'hex');
  update public.shared_pages set edit_token_hash = v_hash
   where id = p_id and edit_token_hash is null and revoked_at is null;
  if not found and not exists(
    select 1 from public.shared_pages
     where id = p_id and edit_token_hash = v_hash and revoked_at is null
  ) then
    raise exception 'shared page cannot be claimed';
  end if;
end;
$$;

create or replace function public.update_shared_page_secure(
  p_id text, p_data jsonb, p_edit_token text
) returns void
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  if pg_column_size(p_data) > 262144 then raise exception 'data too large'; end if;
  update public.shared_pages set data = p_data
   where id = p_id and revoked_at is null
     and edit_token_hash = encode(digest(p_edit_token, 'sha256'), 'hex');
  if not found then raise exception 'shared page not found or edit token mismatch'; end if;
end;
$$;

-- Old clients can update only records that have not yet been claimed.
create or replace function public.update_shared_page(p_id text, p_data jsonb)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if char_length(p_id) < 12 or char_length(p_id) > 32 then raise exception 'invalid id'; end if;
  if pg_column_size(p_data) > 262144 then raise exception 'data too large'; end if;
  update public.shared_pages set data = p_data
   where id = p_id and edit_token_hash is null and revoked_at is null;
  if not found then raise exception 'shared page not found or secure editing is enabled'; end if;
end;
$$;

create or replace function public.delete_shared_page_secure(
  p_id text, p_edit_token text
) returns void
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  delete from public.shared_pages
   where id = p_id
     and edit_token_hash = encode(digest(p_edit_token, 'sha256'), 'hex');
  if not found then raise exception 'shared page not found or edit token mismatch'; end if;
end;
$$;

create or replace function public.get_shared_page(p_id text)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare v_data jsonb;
begin
  select data into v_data from public.shared_pages
   where id = p_id and revoked_at is null limit 1;
  if v_data is null then return null; end if;
  if coalesce((v_data->>'passwordRequired')::boolean, false) then
    return (v_data - array['body','blocks','passwordHash'])
      || jsonb_build_object('locked', true);
  end if;
  return v_data - 'passwordHash';
end;
$$;

create or replace function public.unlock_shared_page(
  p_id text, p_password_hash text
) returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare v_data jsonb;
begin
  select data into v_data from public.shared_pages
   where id = p_id and revoked_at is null limit 1;
  if v_data is null then return null; end if;
  if not coalesce((v_data->>'passwordRequired')::boolean, false) then
    return v_data - 'passwordHash';
  end if;
  if coalesce(v_data->>'passwordHash','') <> coalesce(p_password_hash,'') then return null; end if;
  return v_data - 'passwordHash';
end;
$$;

revoke all on function public.create_shared_page_secure(text,jsonb,text) from public;
revoke all on function public.claim_shared_page(text,text) from public;
revoke all on function public.update_shared_page_secure(text,jsonb,text) from public;
revoke all on function public.delete_shared_page_secure(text,text) from public;
revoke all on function public.unlock_shared_page(text,text) from public;

grant execute on function public.create_shared_page_secure(text,jsonb,text) to anon, authenticated;
grant execute on function public.update_shared_page_secure(text,jsonb,text) to anon, authenticated;
grant execute on function public.delete_shared_page_secure(text,text) to anon, authenticated;
grant execute on function public.unlock_shared_page(text,text) to anon, authenticated;
