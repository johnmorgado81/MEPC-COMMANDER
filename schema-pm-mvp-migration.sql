-- =============================================================
-- PM QUOTE MVP MIGRATION
-- Run in Supabase SQL Editor after existing schema is deployed
-- Safe to run multiple times (uses IF NOT EXISTS guards)
-- =============================================================

-- Buildings: new PM intake fields
do $$ begin
  alter table buildings add column if not exists strata_number    text;
  alter table buildings add column if not exists concierge_name   text;
  alter table buildings add column if not exists concierge_phone  text;
  alter table buildings add column if not exists concierge_email  text;
  alter table buildings add column if not exists concierge_coffee text;
  -- building_notes already added in v1.2 migration; adding here as safety
  alter table buildings add column if not exists building_notes   text;
exception when others then null; end $$;

-- Proposals: subcontractor pricing (internal — not exposed on client PDF)
do $$ begin
  alter table proposals add column if not exists subcontractor_items jsonb default '[]'::jsonb;
exception when others then null; end $$;

comment on column proposals.subcontractor_items is
  'Internal subcontractor cost/markup data. Fields: key, label, sub_cost, markup_pct, sell_price. sell_price rolls into annual_value. sub_cost is never shown on client PDF.';
