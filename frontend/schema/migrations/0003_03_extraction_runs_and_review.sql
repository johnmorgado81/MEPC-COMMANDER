create table if not exists extraction_runs (
  id                  uuid primary key default gen_random_uuid(),
  building_id         uuid references buildings(id) on delete set null,
  registry_version_id uuid references registry_versions(id) on delete set null,
  source_kind         text not null,
  source_filename     text,
  source_storage_path text,
  prompt_version      text not null,
  schema_version      text not null,
  model_name          text,
  status              text not null default 'submitted',
  raw_payload         jsonb not null default '{}'::jsonb,
  normalized_payload  jsonb,
  validation_errors   jsonb not null default '[]'::jsonb,
  raw_text            text,
  created_by          text,
  started_at          timestamptz not null default now(),
  completed_at        timestamptz,
  promoted_at         timestamptz,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint extraction_runs_source_chk check (source_kind in ('pdf','docx','xlsx','image','manual')),
  constraint extraction_runs_status_chk check (status in ('submitted','parsed','validated','failed','promoted','rejected'))
);

create index if not exists extraction_runs_building_idx
on extraction_runs(building_id, created_at desc);

create index if not exists extraction_runs_registry_idx
on extraction_runs(registry_version_id, created_at desc);

do $$ begin
  create trigger extraction_runs_updated_at
  before update on extraction_runs
  for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

create table if not exists extraction_run_rows (
  id                    uuid primary key default gen_random_uuid(),
  extraction_run_id     uuid not null references extraction_runs(id) on delete cascade,
  row_no                integer not null,
  entity_type           text not null,
  candidate_payload     jsonb not null,
  canonical_type        text,
  confidence            numeric(6,4),
  review_status         text not null default 'pending',
  promoted_target_table text,
  promoted_target_id    uuid,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint extraction_run_rows_entity_chk check (entity_type in ('building','asset','subtrade','consumable')),
  constraint extraction_run_rows_review_chk check (review_status in ('pending','accepted','rejected')),
  constraint extraction_run_rows_unique unique (extraction_run_id, row_no, entity_type)
);

create index if not exists extraction_run_rows_run_idx
on extraction_run_rows(extraction_run_id, row_no);

do $$ begin
  create trigger extraction_run_rows_updated_at
  before update on extraction_run_rows
  for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;
