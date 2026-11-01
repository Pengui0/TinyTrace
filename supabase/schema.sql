-- TinyTrace durable workspace storage.
-- Run this complete script once in Supabase Dashboard > SQL Editor.

create table if not exists public.tinytrace_workspace_snapshots (
  workspace_id text primary key,
  snapshot_version integer not null default 1 check (snapshot_version > 0),
  snapshot jsonb not null default jsonb_build_object(
    'investigations', '[]'::jsonb,
    'vendors', '[]'::jsonb,
    'comparisons', '[]'::jsonb,
    'monitoringConfigs', '{}'::jsonb,
    'preferences', '{}'::jsonb,
    'searchHistory', '[]'::jsonb
  ) check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.tinytrace_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tinytrace_workspace_snapshots_set_updated_at
  on public.tinytrace_workspace_snapshots;
create trigger tinytrace_workspace_snapshots_set_updated_at
  before update on public.tinytrace_workspace_snapshots
  for each row execute function public.tinytrace_set_updated_at();

-- A single private workspace is assigned to each authenticated Supabase account.
-- The first account to sign in claims the existing default workspace; later accounts
-- receive isolated workspace IDs created by the TinyTrace server.
create table if not exists public.tinytrace_workspace_memberships (
  workspace_id text primary key,
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.tinytrace_workspace_memberships enable row level security;
revoke all on table public.tinytrace_workspace_memberships from anon, authenticated;
grant select, insert, update, delete on table public.tinytrace_workspace_memberships to service_role;

-- Durable domain repositories used by investigation and evidence processing.
create table if not exists public.tinytrace_domain_records (
  workspace_id text not null default 'default_ws',
  record_type text not null check (record_type in ('vendor', 'investigation', 'signal', 'evidence', 'relationship', 'comparison')),
  record_id text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, record_type, record_id)
);
create index if not exists tinytrace_domain_records_type_idx
  on public.tinytrace_domain_records (workspace_id, record_type, created_at desc);
drop trigger if exists tinytrace_domain_records_set_updated_at on public.tinytrace_domain_records;
create trigger tinytrace_domain_records_set_updated_at
  before update on public.tinytrace_domain_records
  for each row execute function public.tinytrace_set_updated_at();
alter table public.tinytrace_domain_records enable row level security;
revoke all on table public.tinytrace_domain_records from anon, authenticated;
grant select, insert, update, delete on table public.tinytrace_domain_records to service_role;

-- Durable background schedules. Keep one TinyTrace scheduler instance running.
create table if not exists public.tinytrace_monitor_jobs (
  monitor_id text primary key,
  workspace_id text not null default 'default_ws',
  company_name text not null,
  identifier_type text not null,
  identifier_value text not null default '',
  baseline_report_id text not null,
  frequency text not null check (frequency in ('DAILY', 'WEEKLY', 'MONTHLY')),
  enabled boolean not null default true,
  last_checked_at timestamptz,
  next_check_at timestamptz not null,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tinytrace_monitor_jobs_due_idx
  on public.tinytrace_monitor_jobs (workspace_id, enabled, next_check_at);

drop trigger if exists tinytrace_monitor_jobs_set_updated_at on public.tinytrace_monitor_jobs;
create trigger tinytrace_monitor_jobs_set_updated_at
  before update on public.tinytrace_monitor_jobs
  for each row execute function public.tinytrace_set_updated_at();

-- Durable inbox. Only meaningful new or changed signals create notifications.
create table if not exists public.tinytrace_monitor_notifications (
  id text primary key,
  workspace_id text not null default 'default_ws',
  monitor_id text not null,
  company_name text not null,
  comparison_id text not null,
  title text not null,
  summary text not null,
  changes jsonb not null default '[]'::jsonb check (jsonb_typeof(changes) = 'array'),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists tinytrace_monitor_notifications_inbox_idx
  on public.tinytrace_monitor_notifications (workspace_id, created_at desc);

alter table public.tinytrace_monitor_jobs enable row level security;
alter table public.tinytrace_monitor_notifications enable row level security;
revoke all on table public.tinytrace_monitor_jobs, public.tinytrace_monitor_notifications from anon, authenticated;
grant select, insert, update, delete on table public.tinytrace_monitor_jobs, public.tinytrace_monitor_notifications to service_role;

alter table public.tinytrace_workspace_snapshots enable row level security;

-- Browser roles cannot read or write workspace data. TinyTrace's server uses
-- SUPABASE_SECRET_KEY; restrict public app access at the hosting/network layer.
revoke all on table public.tinytrace_workspace_snapshots from anon, authenticated;
grant select, insert, update, delete on table public.tinytrace_workspace_snapshots to service_role;

-- Remove the old synthetic walkthrough records from existing Supabase workspaces.
-- This preserves all non-synthetic reports and workspace data.
update public.tinytrace_workspace_snapshots as workspace
set snapshot = workspace.snapshot || jsonb_build_object(
  'investigations', coalesce((
    select jsonb_agg(item)
    from jsonb_array_elements(coalesce(workspace.snapshot->'investigations', '[]'::jsonb)) as entries(item)
    where coalesce(item->>'executionMode', '') <> 'DEMO'
      and coalesce(item->>'id', '') not like 'inv_demo_run_%'
      and lower(coalesce(item->>'targetName', '')) not like '%acme horizon technologies%'
      and lower(coalesce(item->>'targetName', '')) not like '%synthetic demo%'
  ), '[]'::jsonb),
  'vendors', coalesce((
    select jsonb_agg(item)
    from jsonb_array_elements(coalesce(workspace.snapshot->'vendors', '[]'::jsonb)) as entries(item)
    where coalesce(item->>'id', '') not like 'ven_demo_%'
      and lower(coalesce(item->>'canonicalName', '')) not like '%acme horizon technologies%'
      and lower(coalesce(item->>'canonicalName', '')) not like '%synthetic demo%'
  ), '[]'::jsonb),
  'comparisons', coalesce((
    select jsonb_agg(item)
    from jsonb_array_elements(coalesce(workspace.snapshot->'comparisons', '[]'::jsonb)) as entries(item)
    where item::text not like '%inv_demo_run_%'
      and lower(item::text) not like '%acme horizon technologies%'
  ), '[]'::jsonb),
  'monitoringConfigs', coalesce((
    select jsonb_object_agg(entry.key, entry.value)
    from jsonb_each(coalesce(workspace.snapshot->'monitoringConfigs', '{}'::jsonb)) as entry
    where entry.key not like 'inv_demo_run_%'
      and entry.value::text not like '%inv_demo_run_%'
      and lower(entry.value::text) not like '%acme horizon technologies%'
  ), '{}'::jsonb),
  'searchHistory', coalesce((
    select jsonb_agg(item)
    from jsonb_array_elements(coalesce(workspace.snapshot->'searchHistory', '[]'::jsonb)) as entries(item)
    where lower(item::text) not like '%acme horizon technologies%'
      and lower(item::text) not like '%synthetic demo%'
  ), '[]'::jsonb),
  'preferences', coalesce(workspace.snapshot->'preferences', '{}'::jsonb)
    || jsonb_build_object('executionMode', 'LIVE')
    || jsonb_build_object('settings',
      (coalesce(workspace.snapshot->'preferences'->'settings', '{}'::jsonb)
        - 'mockTestResults' - 'tinyfishMockScenario'
        - case when coalesce(workspace.snapshot->'preferences'->'settings'->'tinyfishTestResult'->>'isMock', 'false') = 'true'
          then 'tinyfishTestResult' else '__keep__' end)
    )
    || case when coalesce(workspace.snapshot->'preferences'->>'currentInvestigationId', '') like 'inv_demo_run_%'
      then jsonb_build_object('currentInvestigationId', null) else '{}'::jsonb end
)
where workspace.snapshot::text ilike any (array['%inv_demo_run_%', '%ven_demo_%', '%acme horizon technologies%', '%synthetic demo%']);

delete from public.tinytrace_monitor_notifications
where lower(company_name) like '%acme horizon technologies%'
   or lower(company_name) like '%synthetic demo%'
   or monitor_id like 'mon_demo_%';

delete from public.tinytrace_monitor_jobs
where lower(company_name) like '%acme horizon technologies%'
   or lower(company_name) like '%synthetic demo%'
   or baseline_report_id like 'inv_demo_run_%'
   or monitor_id like 'mon_demo_%';

-- Verify the table and RLS state after running this script.
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('tinytrace_workspace_memberships', 'tinytrace_workspace_snapshots', 'tinytrace_domain_records', 'tinytrace_monitor_jobs', 'tinytrace_monitor_notifications')
order by tablename;
