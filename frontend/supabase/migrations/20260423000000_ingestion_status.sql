-- Registry-first ingestion: add ingestion_status and source_file to equipment table
-- Idempotent
alter table equipment add column if not exists ingestion_status text default 'normalized';
alter table equipment add column if not exists source_file       text;
alter table equipment add column if not exists equipment_type_raw text;

-- Back-fill existing rows
update equipment set ingestion_status = 'normalized' where ingestion_status is null;

-- Allowed values: raw_extracted | normalized | needs_review | verified | proposal_ready
-- Proposal system should read: verified | proposal_ready | normalized (fallback)
