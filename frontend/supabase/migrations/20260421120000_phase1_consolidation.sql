-- Phase 1 Consolidation — Canonical schema alignment
-- Idempotent. Run in Supabase SQL Editor.

-- ── Building: photo, notes, area flags, rate profile ─────────────────────────
alter table buildings add column if not exists photo_url           text;
alter table buildings add column if not exists building_notes      text;
alter table buildings add column if not exists area_flags          jsonb default '{}'::jsonb;
alter table buildings add column if not exists rate_profile        text  default 'standard';
alter table buildings add column if not exists optional_sections   jsonb default '{}'::jsonb;
alter table buildings add column if not exists strata_number       text;
alter table buildings add column if not exists concierge_name      text;
alter table buildings add column if not exists concierge_phone     text;
alter table buildings add column if not exists concierge_email     text;
alter table buildings add column if not exists concierge_coffee    text;

-- ── Equipment: canonical field set ───────────────────────────────────────────
-- Unified make/manufacturer field
alter table equipment add column if not exists manufacturer              text;
alter table equipment add column if not exists make                      text;
-- Service regimen
alter table equipment add column if not exists quarterly_hours           numeric(6,2);
alter table equipment add column if not exists annual_hours              numeric(6,2);
alter table equipment add column if not exists override_quarterly_hours  numeric(6,2);
alter table equipment add column if not exists override_annual_hours     numeric(6,2);
alter table equipment add column if not exists annual_cleaning_enabled   boolean default false;
-- Import metadata
alter table equipment add column if not exists ocr_raw                   text;
alter table equipment add column if not exists equipment_type_raw        text;
alter table equipment add column if not exists review_status             text default 'ok';
alter table equipment add column if not exists match_confidence          text default 'manual';
alter table equipment add column if not exists is_duplicate              boolean default false;
alter table equipment add column if not exists import_batch              text;
alter table equipment add column if not exists source_type               text default 'manual';
-- Registry fields
alter table equipment add column if not exists consumables               jsonb default '[]'::jsonb;
alter table equipment add column if not exists qty                       integer default 1;
alter table equipment add column if not exists service_area              text default 'common_strata';
alter table equipment add column if not exists category                  text;
alter table equipment add column if not exists equipment_class           text;
-- Capacity/specs
alter table equipment add column if not exists capacity                  text;
alter table equipment add column if not exists refrigerant               text;

-- ── Proposals: canonical field set ───────────────────────────────────────────
alter table proposals add column if not exists manual_items         jsonb  default '[]'::jsonb;
alter table proposals add column if not exists calc_snapshot        jsonb  default '{}'::jsonb;
alter table proposals add column if not exists subcontractor_items  jsonb  default '[]'::jsonb;
alter table proposals add column if not exists raw_intake           jsonb  default '{}'::jsonb;
alter table proposals add column if not exists cover_image_url      text;
alter table proposals add column if not exists is_draft             boolean default true;
alter table proposals add column if not exists quarter_visits       jsonb  default '{"q1":true,"q2":true,"q3":true,"q4":true,"annual_clean":false}'::jsonb;
alter table proposals add column if not exists service_area_type    text   default 'shared';
alter table proposals add column if not exists tax_rate             numeric(6,4) default 0.05;
alter table proposals add column if not exists tax_amount           numeric(12,2) default 0;
alter table proposals add column if not exists total_annual_value   numeric(12,2) default 0;
alter table proposals add column if not exists contract_start       date;
alter table proposals add column if not exists payment_terms        text   default 'Net 30';

-- ── Company profile stored in user_settings (key='company_profile') ──────────
-- No schema change needed — user_settings is a key/value jsonb store.

-- ── Normalize make → manufacturer where manufacturer is null ─────────────────
update equipment set manufacturer = make where manufacturer is null and make is not null;
