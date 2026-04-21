alter table proposals
add column if not exists manual_items jsonb not null default '[]'::jsonb;

alter table proposals
add column if not exists calc_snapshot jsonb not null default '{}'::jsonb;

alter table proposals
add column if not exists subcontractor_items jsonb not null default '[]'::jsonb;

alter table proposals
add column if not exists raw_intake jsonb not null default '{}'::jsonb;

alter table proposals
add column if not exists cover_image_url text;

alter table proposals
add column if not exists is_draft boolean not null default true;

alter table proposals
add column if not exists tax_rate numeric(6,4) not null default 0.05;

alter table proposals
add column if not exists tax_amount numeric(12,2) not null default 0;

alter table proposals
add column if not exists total_annual_value numeric(12,2) not null default 0;
