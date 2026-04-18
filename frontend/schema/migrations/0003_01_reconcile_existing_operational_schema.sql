create extension if not exists "pgcrypto";

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- buildings: reconcile current schema with actual wizard fields

do $$
begin
  alter table buildings add column if not exists strata_number        text;
  alter table buildings add column if not exists contact_name         text;
  alter table buildings add column if not exists contact_email        text;
  alter table buildings add column if not exists contact_phone        text;
  alter table buildings add column if not exists concierge_name       text;
  alter table buildings add column if not exists concierge_phone      text;
  alter table buildings add column if not exists concierge_email      text;
  alter table buildings add column if not exists concierge_coffee     text;
  alter table buildings add column if not exists building_notes       text;
  alter table buildings add column if not exists proposal_notes       text;
  alter table buildings add column if not exists access_notes         text;
  alter table buildings add column if not exists subcontractor_scopes jsonb not null default '[]'::jsonb;
  alter table buildings add column if not exists common_strata_enabled boolean not null default true;
  alter table buildings add column if not exists commercial_enabled    boolean not null default false;
  alter table buildings add column if not exists residential_enabled   boolean not null default false;
  alter table buildings add column if not exists primary_service_area  text not null default 'common_strata';
exception when others then null;
end $$;

create index if not exists buildings_status_idx on buildings(status);
create index if not exists buildings_city_idx on buildings(city);

-- equipment: keep current operational asset table, add PM fields

do $$
begin
  alter table equipment add column if not exists service_area              text not null default 'common_strata';
  alter table equipment add column if not exists equipment_class           text;
  alter table equipment add column if not exists category                  text;
  alter table equipment add column if not exists qty                       integer not null default 1;
  alter table equipment add column if not exists quarterly_hours           numeric(8,2);
  alter table equipment add column if not exists annual_hours              numeric(8,2);
  alter table equipment add column if not exists override_quarterly_hours  numeric(8,2);
  alter table equipment add column if not exists override_annual_hours     numeric(8,2);
  alter table equipment add column if not exists manufacturer              text;
  alter table equipment add column if not exists description               text;
  alter table equipment add column if not exists source_type               text not null default 'manual';
  alter table equipment add column if not exists source_reference          text;
  alter table equipment add column if not exists match_confidence          text not null default 'manual';
exception when others then null;
end $$;

create index if not exists equipment_service_area_idx on equipment(building_id, service_area);
create index if not exists equipment_category_idx on equipment(category);

-- proposals: reconcile wizard payload with existing table

do $$
begin
  alter table proposals add column if not exists subcontractor_items jsonb not null default '[]'::jsonb;
  alter table proposals add column if not exists raw_intake          jsonb not null default '{}'::jsonb;
  alter table proposals add column if not exists cover_image_url     text;
  alter table proposals add column if not exists is_draft            boolean not null default true;
  alter table proposals add column if not exists tax_rate            numeric(6,4) not null default 0.05;
  alter table proposals add column if not exists tax_amount          numeric(12,2) not null default 0;
  alter table proposals add column if not exists total_annual_value  numeric(12,2) not null default 0;
  alter table proposals add column if not exists calc_snapshot       jsonb not null default '{}'::jsonb;
exception when others then null;
end $$;

create index if not exists proposals_created_idx on proposals(created_at);

-- maintenance item lookup support
create table if not exists equipment_manufacturers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists equipment_aliases (
  id               uuid primary key default gen_random_uuid(),
  canonical_type   text not null,
  alias_text       text not null unique,
  quarterly_hours  numeric(8,2),
  annual_hours     numeric(8,2),
  mapping_note     text,
  created_at       timestamptz not null default now()
);

do $$ begin
  create trigger buildings_updated_at
  before update on buildings
  for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger equipment_updated_at
  before update on equipment
  for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger proposals_updated_at
  before update on proposals
  for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;
