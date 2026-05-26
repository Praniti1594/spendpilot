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

-- Create leads table for email capture
create table leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  company_name text,
  role_title text,
  team_size integer,
  audit_id uuid references audits(id) on delete cascade,
  savings_amount decimal(10, 2),
  created_at timestamp with time zone default now()
);

-- Create unique constraint on email + audit_id to prevent duplicates
create unique index idx_leads_email_audit on leads(email, audit_id) where audit_id is not null;

-- Create index for email lookups
create index idx_leads_email on leads(email);
create index idx_leads_audit_id on leads(audit_id);
create index idx_leads_created_at on leads(created_at desc);

-- Enable RLS on leads
alter table leads enable row level security;

-- Policy: Anyone can insert (for lead capture)
create policy "Allow insert leads" on leads
  for insert with check (true);
