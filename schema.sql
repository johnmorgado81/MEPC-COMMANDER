-- =============================================================
-- MEPC Commander — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- =============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- =============================================================
-- SEQUENCES (for human-readable IDs)
-- =============================================================
create table if not exists app_sequences (
  name    text primary key,
  current bigint not null default 0
);

insert into app_sequences (name, current) values
  ('proposal', 1000),
  ('quote',    2000),
  ('record',   3000)
on conflict do nothing;

-- RPC: get next sequence value atomically
create or replace function next_sequence(seq_name text)
returns bigint
language plpgsql
as $$
declare
  next_val bigint;
begin
  update app_sequences
  set current = current + 1
  where name = seq_name
  returning current into next_val;
  return next_val;
end;
$$;

-- =============================================================
-- BUILDINGS
-- =============================================================
create table if not exists buildings (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  client_name      text,
  client_company   text,
  client_email     text,
  client_phone     text,
  address          text,
  city             text,
  province         text default 'BC',
  postal_code      text,
  building_type    text,   -- commercial, strata, industrial, institutional, other
  floors           integer,
  year_built       integer,
  gross_area_sqft  integer,
  status           text default 'active',  -- active, inactive
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- =============================================================
-- EQUIPMENT
-- =============================================================
create table if not exists equipment (
  id                     uuid primary key default gen_random_uuid(),
  building_id            uuid references buildings(id) on delete cascade,
  tag                    text,             -- e.g. B-1, AHU-2
  equipment_type         text not null,
  make                   text,
  model                  text,
  serial_number          text,
  year_installed         integer,
  location               text,
  capacity               text,
  fuel_type              text,
  refrigerant            text,
  service_interval_months integer default 12,
  last_service_date      date,
  next_service_date      date,
  warranty_expiry        date,
  condition              text default 'Good', -- Good, Fair, Poor, Critical
  under_contract         boolean default false,
  status                 text default 'active', -- active, decommissioned
  notes                  text,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

create index if not exists equipment_building_idx on equipment(building_id);
create index if not exists equipment_next_service_idx on equipment(next_service_date);

-- =============================================================
-- PROPOSALS (PM Contracts)
-- =============================================================
create table if not exists proposals (
  id               uuid primary key default gen_random_uuid(),
  building_id      uuid references buildings(id) on delete cascade,
  proposal_number  text unique,
  title            text,
  status           text default 'draft', -- draft, sent, active, expired, cancelled
  created_date     date default current_date,
  valid_until      date,
  contract_start   date,
  frequency        text,  -- monthly, quarterly, semi-annual, annual
  visits_per_year  integer,
  annual_value     numeric(10,2),
  monthly_value    numeric(10,2),
  payment_terms    text default 'Net 30',
  scope_items      jsonb default '[]'::jsonb,
  -- Each scope_item: { equipment_id, tag, type, scope_text, price, frequency }
  notes            text,
  terms_text       text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists proposals_building_idx on proposals(building_id);
create index if not exists proposals_status_idx on proposals(status);

-- =============================================================
-- PM RECORDS (Service Records)
-- =============================================================
create table if not exists pm_records (
  id                  uuid primary key default gen_random_uuid(),
  building_id         uuid references buildings(id) on delete cascade,
  proposal_id         uuid references proposals(id) on delete set null,
  record_number       text unique,
  service_date        date not null,
  technician          text,
  service_type        text default 'Routine PM',
  equipment_serviced  jsonb default '[]'::jsonb,
  -- Each item: { equipment_id, tag, type, work_notes, hours }
  deficiencies        jsonb default '[]'::jsonb,
  -- Each item: { description, priority, equipment_id, estimated_cost }
  parts_used          jsonb default '[]'::jsonb,
  -- Each item: { part, quantity, cost }
  total_hours         numeric(6,2),
  notes               text,
  status              text default 'complete', -- complete, incomplete, follow-up-required
  created_at          timestamptz default now()
);

create index if not exists pm_records_building_idx on pm_records(building_id);
create index if not exists pm_records_date_idx on pm_records(service_date);

-- =============================================================
-- DEFICIENCIES
-- =============================================================
create table if not exists deficiencies (
  id               uuid primary key default gen_random_uuid(),
  building_id      uuid references buildings(id) on delete cascade,
  equipment_id     uuid references equipment(id) on delete set null,
  pm_record_id     uuid references pm_records(id) on delete set null,
  description      text not null,
  priority         text default 'Medium', -- Critical, High, Medium, Low
  status           text default 'open',   -- open, quoted, in-progress, resolved
  estimated_cost   numeric(10,2),
  identified_date  date default current_date,
  resolved_date    date,
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists deficiencies_building_idx on deficiencies(building_id);
create index if not exists deficiencies_status_idx on deficiencies(status);

-- =============================================================
-- QUOTES
-- =============================================================
create table if not exists quotes (
  id               uuid primary key default gen_random_uuid(),
  building_id      uuid references buildings(id) on delete cascade,
  quote_number     text unique,
  title            text,
  status           text default 'draft', -- draft, sent, accepted, declined, expired
  created_date     date default current_date,
  valid_until      date,
  sent_date        date,
  follow_up_date   date,
  payment_terms    text default 'Net 30',
  line_items       jsonb default '[]'::jsonb,
  -- Each item: { description, qty, unit, unit_price, total }
  subtotal         numeric(10,2) default 0,
  tax_rate         numeric(5,4) default 0.05,
  tax_amount       numeric(10,2) default 0,
  total            numeric(10,2) default 0,
  notes            text,
  internal_notes   text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists quotes_building_idx on quotes(building_id);
create index if not exists quotes_status_idx on quotes(status);
create index if not exists quotes_follow_up_idx on quotes(follow_up_date);

-- =============================================================
-- PRICING MATRIX
-- =============================================================
create table if not exists pricing_matrix (
  id               uuid primary key default gen_random_uuid(),
  equipment_type   text not null,
  service_frequency text not null,  -- monthly, quarterly, semi-annual, annual
  base_price       numeric(10,2),
  sell_price       numeric(10,2) not null,
  overhead_pct     numeric(5,2) default 30,
  margin_pct       numeric(5,2) default 20,
  active           boolean default true,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique(equipment_type, service_frequency)
);

-- =============================================================
-- MAINTENANCE ITEMS LIBRARY
-- Seeded from EQUIPMASTER.xlsx (174 types, 13 categories).
-- Drives time estimates in proposal generator.
-- =============================================================
create table if not exists maintenance_items (
  id                    uuid primary key default gen_random_uuid(),
  equipment_type        text not null unique,
  category              text,               -- HVAC, Hydronic, Plumbing, etc.
  tag_prefix            text,
  manufacturers         text,
  monthly_std_hours     numeric(5,2),
  quarterly_std_hours   numeric(5,2),
  semi_annual_std_hours numeric(5,2),
  annual_std_hours      numeric(5,2),
  belt_size             text,
  filter_size           text,
  filter_type           text,
  lubricant_type        text,
  electrical_data       text,
  description           text,
  active                boolean default true,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists maintenance_items_type_idx on maintenance_items(equipment_type);
create index if not exists maintenance_items_cat_idx  on maintenance_items(category);

-- =============================================================
-- MARKUP MATRIX
-- Stores material markup multipliers by cost tier.
-- Default values from Material_Markup_Matrix.xlsx.
-- Can be updated via Settings page.
-- =============================================================
create table if not exists markup_matrix (
  id         uuid primary key default gen_random_uuid(),
  cost_from  numeric(10,2) not null,
  cost_to    numeric(10,2),       -- null = "and above"
  multiplier numeric(6,4) not null,
  label      text,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Default markup matrix rows (from Material_Markup_Matrix.xlsx)
insert into markup_matrix (cost_from, cost_to, multiplier, label, sort_order) values
  (0.01,    2.49,    3.21, '$0.01 – $2.49',     1),
  (2.50,    4.99,    2.68, '$2.50 – $4.99',     2),
  (5.00,    19.99,   2.07, '$5.00 – $19.99',    3),
  (20.00,   79.99,   1.87, '$20.00 – $79.99',   4),
  (80.00,   149.99,  1.79, '$80.00 – $149.99',  5),
  (150.00,  999.99,  1.61, '$150.00 – $999.99', 6),
  (1000.00, 1999.99, 1.50, '$1,000 – $1,999',   7),
  (2000.00, 2999.99, 1.45, '$2,000 – $2,999',   8),
  (3000.00, null,    1.34, '$3,000 and up',      9)
on conflict do nothing;

-- =============================================================
-- USER SETTINGS (key-value store for admin config)
-- =============================================================
create table if not exists user_settings (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz default now()
);

-- Default rate sheet values (from Schedule D 2024)
insert into user_settings (key, value) values
  ('labour_rates', '{"weekday_callout":145,"weekday_hourly":115,"weekend_callout":260,"weekend_hourly":230,"pm_hourly":115,"minimum_hours":2}')
on conflict do nothing;

-- =============================================================
-- UPDATED_AT TRIGGERS
-- =============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  create trigger buildings_updated_at before update on buildings
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger equipment_updated_at before update on equipment
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger proposals_updated_at before update on proposals
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger deficiencies_updated_at before update on deficiencies
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger quotes_updated_at before update on quotes
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger pricing_updated_at before update on pricing_matrix
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger maintenance_items_updated_at before update on maintenance_items
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger markup_matrix_updated_at before update on markup_matrix
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

-- =============================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable if using Supabase Auth (optional)
-- Comment out entire section if running without auth
-- =============================================================

-- alter table buildings enable row level security;
-- alter table equipment enable row level security;
-- alter table proposals enable row level security;
-- alter table pm_records enable row level security;
-- alter table deficiencies enable row level security;
-- alter table quotes enable row level security;
-- alter table pricing_matrix enable row level security;

-- If you want open access (single-tenant, no auth), run this instead:
-- create policy "allow all" on buildings for all using (true);
-- (Repeat for each table)

-- =============================================================
-- SEED: Default Pricing Matrix (BC Commercial Rates)
-- Run separately after tables are created if desired
-- =============================================================

/*
insert into pricing_matrix (equipment_type, service_frequency, sell_price, overhead_pct, margin_pct) values
  ('Boiler (Hot Water)',   'quarterly',   550, 30, 20),
  ('Boiler (Hot Water)',   'semi-annual', 495, 30, 20),
  ('Boiler (Hot Water)',   'annual',      450, 30, 20),
  ('Boiler (Steam)',       'quarterly',   625, 30, 20),
  ('Boiler (Steam)',       'semi-annual', 575, 30, 20),
  ('Boiler (Steam)',       'annual',      525, 30, 20),
  ('Chiller',              'monthly',     475, 30, 20),
  ('Chiller',              'quarterly',   450, 30, 20),
  ('Chiller',              'semi-annual', 425, 30, 20),
  ('Cooling Tower',        'monthly',     350, 30, 20),
  ('Cooling Tower',        'quarterly',   325, 30, 20),
  ('Cooling Tower',        'semi-annual', 300, 30, 20),
  ('AHU / RTU',            'quarterly',   350, 30, 20),
  ('AHU / RTU',            'semi-annual', 325, 30, 20),
  ('AHU / RTU',            'annual',      295, 30, 20),
  ('MAU',                  'quarterly',   375, 30, 20),
  ('MAU',                  'semi-annual', 350, 30, 20),
  ('MAU',                  'annual',      325, 30, 20),
  ('Fan Coil Unit (FCU)',  'semi-annual', 185, 30, 20),
  ('Fan Coil Unit (FCU)',  'annual',      165, 30, 20),
  ('WSHP',                 'semi-annual', 210, 30, 20),
  ('WSHP',                 'annual',      185, 30, 20),
  ('Circulation Pump',     'semi-annual', 175, 30, 20),
  ('Circulation Pump',     'annual',      150, 30, 20),
  ('DHW Heater',           'annual',      250, 30, 20),
  ('Backflow Preventer',   'annual',      225, 30, 20),
  ('Exhaust Fan',          'semi-annual', 145, 30, 20),
  ('Exhaust Fan',          'annual',      125, 30, 20)
on conflict (equipment_type, service_frequency) do nothing;
*/

-- =============================================================
-- PROPOSAL WIZARD MIGRATION (run these if upgrading from v1.0)
-- Safe to run multiple times — uses IF NOT EXISTS guards
-- =============================================================

do $$ begin
  alter table proposals add column if not exists cover_image_url text;
  alter table proposals add column if not exists raw_intake jsonb;
  alter table proposals add column if not exists is_draft boolean default true;
exception when others then null; end $$;

comment on column proposals.cover_image_url is 'URL or null — cover image stored externally if using Supabase Storage';
comment on column proposals.raw_intake is 'Raw extracted data from OCR, file parse, and drawing scan';
comment on column proposals.is_draft is 'True while proposal is in wizard/draft state';

-- =============================================================
-- BUILDING + EQUIPMENT EXTENDED MODEL (v1.2 migration)
-- Run in Supabase SQL Editor — safe to run multiple times
-- =============================================================

-- Buildings: extended fields
do $$ begin
  alter table buildings add column if not exists contact_name       text;
  alter table buildings add column if not exists contact_email      text;
  alter table buildings add column if not exists contact_phone      text;
  alter table buildings add column if not exists building_notes     text;
  alter table buildings add column if not exists proposal_notes     text;
  alter table buildings add column if not exists access_notes       text;
  alter table buildings add column if not exists subcontractor_scopes jsonb default '[]'::jsonb;
  -- Service area enablement flags
  alter table buildings add column if not exists common_strata_enabled        boolean default true;
  alter table buildings add column if not exists commercial_enabled           boolean default false;
  alter table buildings add column if not exists residential_enabled          boolean default false;
  alter table buildings add column if not exists primary_service_area         text    default 'common_strata';
exception when others then null; end $$;

-- Equipment: extended fields for PM proposal workflow
do $$ begin
  alter table equipment add column if not exists service_area              text    default 'common_strata';
  alter table equipment add column if not exists equipment_class           text;
  alter table equipment add column if not exists category                  text;
  alter table equipment add column if not exists qty                       integer default 1;
  alter table equipment add column if not exists quarterly_hours           numeric(6,2);
  alter table equipment add column if not exists annual_hours              numeric(6,2);
  alter table equipment add column if not exists override_quarterly_hours  numeric(6,2);
  alter table equipment add column if not exists override_annual_hours     numeric(6,2);
  alter table equipment add column if not exists manufacturer              text;
  alter table equipment add column if not exists description               text;
  alter table equipment add column if not exists source_type               text    default 'manual';
  alter table equipment add column if not exists source_reference          text;
  alter table equipment add column if not exists match_confidence          text    default 'manual';
exception when others then null; end $$;

-- Rename make column if it exists as "make" already (no-op if already "manufacturer")
-- (The original schema used "make" — equipment.js now uses "manufacturer")
-- Keep both: "make" stays for backward compat, "manufacturer" is the new display field
-- They are separate columns; openForm writes to "manufacturer"

-- Index for service area grouping
create index if not exists equipment_service_area_idx on equipment(building_id, service_area);
create index if not exists equipment_category_idx     on equipment(category);

-- =============================================================
-- EQUIPMASTER DATASET UPGRADE MIGRATION
-- Run after initial schema is already deployed
-- =============================================================

-- Update maintenance_items column names if upgrading from v1.0
-- (safe to run multiple times)
do $$ begin
  -- Add new-name columns if they don't exist
  alter table maintenance_items add column if not exists quarterly_hours   numeric(5,2);
  alter table maintenance_items add column if not exists annual_hours      numeric(5,2);
  alter table maintenance_items add column if not exists semi_annual_hours numeric(5,2);
  alter table maintenance_items add column if not exists monthly_hours     numeric(5,2);
  alter table maintenance_items add column if not exists building_age      text;
  alter table maintenance_items add column if not exists electrical_data   text;
  -- Copy from old columns if they exist
  update maintenance_items set quarterly_hours   = quarterly_std_hours   where quarterly_hours is null and quarterly_std_hours is not null;
  update maintenance_items set annual_hours      = annual_std_hours      where annual_hours is null and annual_std_hours is not null;
  update maintenance_items set semi_annual_hours = semi_annual_std_hours where semi_annual_hours is null and semi_annual_std_hours is not null;
  update maintenance_items set monthly_hours     = monthly_std_hours     where monthly_hours is null and monthly_std_hours is not null;
exception when others then null; end $$;

-- =============================================================
-- EQUIPMENT MANUFACTURERS TABLE (normalized from EQUIPMASTER)
-- =============================================================
create table if not exists equipment_manufacturers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz default now()
);

-- =============================================================
-- EQUIPMENT ALIASES (from _SUMMARY_HOURS_SOURCE sheet)
-- Maps supplementary source names to canonical EQUIPMASTER types
-- =============================================================
create table if not exists equipment_aliases (
  id             uuid primary key default gen_random_uuid(),
  canonical_type text not null,
  alias_text     text not null,
  quarterly_hours numeric(5,2),
  annual_hours    numeric(5,2),
  mapping_note    text,
  created_at      timestamptz default now(),
  unique(alias_text)
);

do $$ begin
  create trigger equipment_manufacturers_no_upd before update on equipment_manufacturers
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

-- =============================================================
-- PM QUOTES TABLE (PM Quote MVP)
-- =============================================================
create table if not exists pm_quotes (
  id                    uuid primary key default gen_random_uuid(),
  quote_number          text unique,
  status                text default 'draft',
  -- Customer / Building
  management_company    text,
  contact_name          text,
  contact_email         text,
  contact_phone         text,
  concierge_name        text,
  concierge_phone       text,
  concierge_email       text,
  concierge_coffee      text,
  building_name         text,
  strata_number         text,
  address               text,
  city                  text,
  province              text default 'BC',
  postal_code           text,
  building_type         text,
  notes                 text,
  building_id           uuid references buildings(id) on delete set null,
  cover_image_data      text,
  -- Contract
  frequency             text default 'quarterly',
  contract_start        date,
  valid_until           date,
  payment_terms         text default 'Net 30',
  -- Data
  equipment_items       jsonb default '[]',
  subcontractors        jsonb default '{}',
  market_units          jsonb default '{}',
  -- Pricing
  pm_labour_annual      numeric(10,2) default 0,
  sub_sell_annual       numeric(10,2) default 0,
  market_unit_annual    numeric(10,2) default 0,
  common_property_total numeric(10,2) default 0,
  -- Timestamps
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists pm_quotes_status_idx on pm_quotes(status);
create index if not exists pm_quotes_created_idx on pm_quotes(created_at);

do $$ begin
  create trigger pm_quotes_updated_at before update on pm_quotes
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;
