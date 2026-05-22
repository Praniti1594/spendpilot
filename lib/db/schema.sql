-- SQL to run in Supabase SQL Editor
-- Copy and paste this into your Supabase project

-- Create audits table
create table audits (
  id uuid primary key default gen_random_uuid(),
  items jsonb not null,
  recommendations jsonb not null,
  total_monthly_spend decimal(10, 2) not null,
  total_monthly_after_savings decimal(10, 2) not null,
  total_monthly_savings decimal(10, 2) not null,
  total_annual_savings decimal(10, 2) not null,
  savings_percentage decimal(5, 2) not null,
  summary text,
  is_public boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create index for public audits
create index idx_audits_is_public on audits(is_public);
create index idx_audits_created_at on audits(created_at desc);

-- Enable RLS
alter table audits enable row level security;

-- Policy: Anyone can insert
create policy "Allow insert" on audits
  for insert with check (true);

-- Policy: Anyone can read public audits
create policy "Allow read public" on audits
  for select using (is_public = true);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger for updated_at
create trigger update_audits_updated_at before update on audits
    for each row execute function update_updated_at_column();
