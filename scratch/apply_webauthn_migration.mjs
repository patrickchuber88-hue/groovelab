import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: 'apps/groovelab/.env.local' });

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

async function run() {
  console.log("Applying user_credentials migration to database...");
  
  const sql = `
drop table if exists public.user_credentials cascade;

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

-- Drop existing policies if they exist to prevent errors
drop policy if exists "Users can view their own credentials" on public.user_credentials;
drop policy if exists "Users can delete their own credentials" on public.user_credentials;
drop policy if exists "Allow insert for authenticated users" on public.user_credentials;

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

-- Secure RPC function to fetch user_id by credential_id during login (bypassing RLS safely)
create or replace function public.get_user_id_by_credential(input_credential_id text)
returns uuid as $$
declare
    v_user_id uuid;
begin
    select user_id into v_user_id
    from public.user_credentials
    where credential_id = input_credential_id;
    
    return v_user_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.get_user_id_by_credential(text) to anon, authenticated, service_role;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
  `;

  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) {
    console.error("Migration failed:", error.message);
  } else {
    console.log("Migration applied successfully!");
  }
}
run();
