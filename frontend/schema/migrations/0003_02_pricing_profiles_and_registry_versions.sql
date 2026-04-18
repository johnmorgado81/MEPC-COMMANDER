create table if not exists pricing_profiles (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,
  name               text not null,
  pm_hourly          numeric(12,2) not null,
  overhead_pct       numeric(8,4) not null default 0.30,
  target_margin_pct  numeric(8,4) not null default 0.20,
  tax_rate           numeric(8,4) not null default 0.05,
  active             boolean not null default true,
  is_default         boolean not null default false,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint pricing_profiles_overhead_chk check (overhead_pct >= 0 and overhead_pct <= 5),
  constraint pricing_profiles_margin_chk   check (target_margin_pct >= 0 and target_margin_pct < 1),
  constraint pricing_profiles_tax_chk      check (tax_rate >= 0 and tax_rate < 1)
);

create unique index if not exists pricing_profiles_one_default_idx
on pricing_profiles (is_default)
where is_default = true and active = true;

do $$ begin
  create trigger pricing_profiles_updated_at
  before update on pricing_profiles
  for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

create table if not exists registry_versions (
  id                        uuid primary key default gen_random_uuid(),
  building_id               uuid not null references buildings(id) on delete cascade,
  version_no                integer not null,
  source_kind               text not null default 'manual',
  status                    text not null default 'draft',
  schema_version            text not null default 'pm-registry.v1',
  workbook_template_version text not null default 'v1',
  notes                     text,
  is_current                boolean not null default false,
  locked_at                 timestamptz,
  verified_at               timestamptz,
  verified_by               text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint registry_versions_unique unique (building_id, version_no),
  constraint registry_versions_source_chk check (source_kind in ('manual','extraction','import')),
  constraint registry_versions_status_chk check (status in ('draft','under_review','verified','archived'))
);

create unique index if not exists registry_versions_one_current_idx
on registry_versions (building_id)
where is_current = true;

create index if not exists registry_versions_building_idx
on registry_versions(building_id, status, version_no desc);

do $$ begin
  create trigger registry_versions_updated_at
  before update on registry_versions
  for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

create table if not exists registry_assets (
  id                          uuid primary key default gen_random_uuid(),
  registry_version_id         uuid not null references registry_versions(id) on delete cascade,
  sort_order                  integer not null default 0,
  source_row_key              text,
  service_area                text not null default 'common_strata',
  canonical_equipment_type    text not null,
  display_label               text,
  equipment_class             text,
  category                    text,
  tag                         text,
  qty                         integer not null default 1,
  location                    text,
  manufacturer                text,
  model                       text,
  serial_number               text,
  description                 text,
  frequency                   text not null default 'quarterly',
  monthly_hours               numeric(8,2),
  quarterly_hours             numeric(8,2),
  semi_annual_hours           numeric(8,2),
  annual_hours                numeric(8,2),
  override_monthly_hours      numeric(8,2),
  override_quarterly_hours    numeric(8,2),
  override_semi_annual_hours  numeric(8,2),
  override_annual_hours       numeric(8,2),
  pricing_mode                text not null default 'hours',
  manual_annual_sell          numeric(12,2),
  source_type                 text not null default 'manual',
  source_reference            text,
  match_confidence            text not null default 'manual',
  review_status               text not null default 'pending',
  notes                       text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint registry_assets_qty_chk check (qty > 0),
  constraint registry_assets_service_area_chk check (service_area in ('common_strata','commercial','residential_in_suite')),
  constraint registry_assets_frequency_chk check (frequency in ('monthly','quarterly','semi-annual','annual')),
  constraint registry_assets_pricing_mode_chk check (pricing_mode in ('hours','fixed')),
  constraint registry_assets_review_status_chk check (review_status in ('pending','verified','rejected'))
);

create index if not exists registry_assets_version_idx
on registry_assets(registry_version_id, sort_order);

create index if not exists registry_assets_lookup_idx
on registry_assets(registry_version_id, service_area, category, canonical_equipment_type);

do $$ begin
  create trigger registry_assets_updated_at
  before update on registry_assets
  for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

create table if not exists registry_subtrades (
  id                  uuid primary key default gen_random_uuid(),
  registry_version_id uuid not null references registry_versions(id) on delete cascade,
  sort_order          integer not null default 0,
  subtrade_code       text not null,
  label               text not null,
  scope_text          text,
  frequency           text not null default 'annual',
  vendor_name         text,
  annual_cost         numeric(12,2) not null default 0,
  markup_pct          numeric(8,4) not null default 0,
  annual_sell         numeric(12,2) not null default 0,
  enabled             boolean not null default true,
  source_type         text not null default 'manual',
  review_status       text not null default 'verified',
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint registry_subtrades_freq_chk check (frequency in ('monthly','quarterly','semi-annual','annual')),
  constraint registry_subtrades_cost_chk check (annual_cost >= 0 and annual_sell >= 0),
  constraint registry_subtrades_review_chk check (review_status in ('pending','verified','rejected')),
  constraint registry_subtrades_unique unique (registry_version_id, subtrade_code, label)
);

create index if not exists registry_subtrades_version_idx
on registry_subtrades(registry_version_id, sort_order);

do $$ begin
  create trigger registry_subtrades_updated_at
  before update on registry_subtrades
  for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

create table if not exists registry_consumables (
  id                  uuid primary key default gen_random_uuid(),
  registry_version_id uuid not null references registry_versions(id) on delete cascade,
  sort_order          integer not null default 0,
  item_code           text,
  label               text not null,
  unit                text not null default 'ea',
  annual_qty          numeric(12,2) not null default 0,
  unit_cost           numeric(12,2) not null default 0,
  markup_pct          numeric(8,4) not null default 0,
  annual_cost         numeric(12,2) not null default 0,
  annual_sell         numeric(12,2) not null default 0,
  enabled             boolean not null default true,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint registry_consumables_nonnegative_chk check (
    annual_qty >= 0 and unit_cost >= 0 and annual_cost >= 0 and annual_sell >= 0
  )
);

create index if not exists registry_consumables_version_idx
on registry_consumables(registry_version_id, sort_order);

do $$ begin
  create trigger registry_consumables_updated_at
  before update on registry_consumables
  for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;
