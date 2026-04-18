do $$
begin
  alter table proposals add column if not exists registry_version_id        uuid references registry_versions(id) on delete set null;
  alter table proposals add column if not exists extraction_run_id          uuid references extraction_runs(id) on delete set null;
  alter table proposals add column if not exists pricing_profile_id         uuid references pricing_profiles(id) on delete set null;
  alter table proposals add column if not exists schema_version             text not null default 'pm-registry.v1';
  alter table proposals add column if not exists workbook_template_version  text not null default 'v1';
  alter table proposals add column if not exists proposal_template_version  text not null default 'v1';
  alter table proposals add column if not exists export_status              text not null default 'not_exported';
exception when others then null;
end $$;

create index if not exists proposals_registry_version_idx on proposals(registry_version_id);
create index if not exists proposals_extraction_run_idx on proposals(extraction_run_id);

create table if not exists proposal_lines (
  id                            uuid primary key default gen_random_uuid(),
  proposal_id                   uuid not null references proposals(id) on delete cascade,
  sort_order                    integer not null default 0,
  line_type                     text not null,
  source_registry_asset_id      uuid references registry_assets(id) on delete set null,
  source_registry_subtrade_id   uuid references registry_subtrades(id) on delete set null,
  source_registry_consumable_id uuid references registry_consumables(id) on delete set null,
  label                         text not null,
  category                      text,
  frequency                     text,
  qty                           numeric(12,2) not null default 1,
  annual_price                  numeric(12,2) not null default 0,
  scope_lines                   jsonb not null default '[]'::jsonb,
  metadata                      jsonb not null default '{}'::jsonb,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint proposal_lines_type_chk check (line_type in ('asset','subtrade','consumable','summary')),
  constraint proposal_lines_price_chk check (annual_price >= 0),
  constraint proposal_lines_qty_chk check (qty >= 0)
);

create index if not exists proposal_lines_proposal_idx
on proposal_lines(proposal_id, sort_order);

do $$ begin
  create trigger proposal_lines_updated_at
  before update on proposal_lines
  for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

create table if not exists export_artifacts (
  id                  uuid primary key default gen_random_uuid(),
  proposal_id         uuid references proposals(id) on delete cascade,
  registry_version_id uuid references registry_versions(id) on delete set null,
  artifact_type       text not null,
  storage_bucket      text,
  storage_path        text not null,
  file_name           text not null,
  content_hash        text,
  byte_size           bigint,
  created_by          text,
  created_at          timestamptz not null default now(),
  constraint export_artifacts_type_chk check (
    artifact_type in ('workbook','proposal_pdf','proposal_package','json_snapshot')
  )
);

create index if not exists export_artifacts_proposal_idx
on export_artifacts(proposal_id, created_at desc);

create index if not exists export_artifacts_registry_idx
on export_artifacts(registry_version_id, created_at desc);
