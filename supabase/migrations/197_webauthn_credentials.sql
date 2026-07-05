-- Migration: 197_webauthn_credentials.sql
-- Create table for storing WebAuthn public keys associated with user accounts for biometrics.

create table if not exists public.user_credentials (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users_raw(id) on delete cascade not null,
  credential_id text unique not null,
  public_key text not null,
  counter bigint default 0 not null,
  device_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.user_credentials enable row level security;

-- Policies for the user to select and delete their own credentials
create policy "Users can view their own credentials"
  on public.user_credentials for select
  using (public.get_auth_user_id_or_header() = user_id);

create policy "Users can delete their own credentials"
  on public.user_credentials for delete
  using (public.get_auth_user_id_or_header() = user_id);

-- Policy to allow the user to register/insert credentials
create policy "Allow insert for authenticated users"
  on public.user_credentials for insert
  with check (public.get_auth_user_id_or_header() = user_id);
