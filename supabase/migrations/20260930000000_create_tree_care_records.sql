create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (length(trim(first_name)) between 1 and 100),
  last_name text not null check (length(trim(last_name)) between 1 and 100),
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text check (state is null or length(state) = 2),
  postal_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trees (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  common_name text not null check (length(trim(common_name)) between 1 and 150),
  scientific_name text,
  location_description text,
  planted_year integer check (planted_year is null or planted_year between 1800 and extract(year from now())::integer),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pests (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 150),
  scientific_name text,
  description text,
  treatment_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.diseases (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 150),
  scientific_name text,
  description text,
  treatment_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tree_pest_observations (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  pest_id uuid not null references public.pests(id) on delete restrict,
  observed_on date not null default current_date,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'active' check (status in ('active', 'monitoring', 'treated', 'resolved')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tree_disease_observations (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  disease_id uuid not null references public.diseases(id) on delete restrict,
  observed_on date not null default current_date,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'active' check (status in ('active', 'monitoring', 'treated', 'resolved')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trees_customer_id_idx on public.trees(customer_id);
create index if not exists tree_pest_observations_tree_id_idx on public.tree_pest_observations(tree_id);
create index if not exists tree_pest_observations_pest_id_idx on public.tree_pest_observations(pest_id);
create index if not exists tree_disease_observations_tree_id_idx on public.tree_disease_observations(tree_id);
create index if not exists tree_disease_observations_disease_id_idx on public.tree_disease_observations(disease_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at before update on public.customers for each row execute function public.set_updated_at();
drop trigger if exists trees_set_updated_at on public.trees;
create trigger trees_set_updated_at before update on public.trees for each row execute function public.set_updated_at();
drop trigger if exists pests_set_updated_at on public.pests;
create trigger pests_set_updated_at before update on public.pests for each row execute function public.set_updated_at();
drop trigger if exists diseases_set_updated_at on public.diseases;
create trigger diseases_set_updated_at before update on public.diseases for each row execute function public.set_updated_at();
drop trigger if exists tree_pest_observations_set_updated_at on public.tree_pest_observations;
create trigger tree_pest_observations_set_updated_at before update on public.tree_pest_observations for each row execute function public.set_updated_at();
drop trigger if exists tree_disease_observations_set_updated_at on public.tree_disease_observations;
create trigger tree_disease_observations_set_updated_at before update on public.tree_disease_observations for each row execute function public.set_updated_at();

alter table public.customers enable row level security;
alter table public.trees enable row level security;
alter table public.pests enable row level security;
alter table public.diseases enable row level security;
alter table public.tree_pest_observations enable row level security;
alter table public.tree_disease_observations enable row level security;

revoke all on public.customers, public.trees, public.pests, public.diseases,
  public.tree_pest_observations, public.tree_disease_observations
  from anon, authenticated;

comment on table public.customers is 'Private customer records; access through the staff-authenticated API only.';
comment on table public.trees is 'Customer trees; access through the staff-authenticated API only.';
comment on table public.pests is 'Pest reference catalog; access through the staff-authenticated API only.';
comment on table public.diseases is 'Disease reference catalog; access through the staff-authenticated API only.';