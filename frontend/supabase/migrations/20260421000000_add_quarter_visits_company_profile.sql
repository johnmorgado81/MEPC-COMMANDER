-- Quarter visits and service area on proposals
alter table proposals add column if not exists quarter_visits    jsonb default '{"q1":true,"q2":true,"q3":true,"q4":true,"annual_clean":false}'::jsonb;
alter table proposals add column if not exists service_area_type text  default 'shared';

-- Company profile persisted in user_settings (key = 'company_profile')
-- user_settings table already exists; no schema change needed.

-- Building photo (already added in prior migration — ensure idempotent)
alter table buildings add column if not exists photo_url text;

-- Equipment: make alias and annual_cleaning_enabled (ensure idempotent)
alter table equipment add column if not exists annual_cleaning_enabled boolean default false;
alter table equipment add column if not exists ocr_raw                 text;
alter table equipment add column if not exists review_status           text default 'ok';
alter table equipment add column if not exists is_duplicate            boolean default false;
alter table equipment add column if not exists consumables             jsonb default '[]'::jsonb;
alter table equipment add column if not exists import_batch            text;
alter table equipment add column if not exists make                    text;
