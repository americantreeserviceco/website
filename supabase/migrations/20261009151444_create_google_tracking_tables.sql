create table if not exists public.locations (
    location_id serial primary key,
    city varchar(100) not null,
    state char(2) not null default 'CO',
    page_url varchar(255) not null unique,
    created_at timestamptz not null default current_timestamp,
    constraint locations_city_state_unique unique (city, state)
);

create table if not exists public.keywords (
    keyword_id serial primary key,
    location_id integer not null references public.locations(location_id) on delete cascade,
    keyword_text varchar(255) not null,
    target_search_volume integer not null default 0 check (target_search_volume >= 0),
    created_at timestamptz not null default current_timestamp,
    constraint keywords_location_text_unique unique (location_id, keyword_text)
);

create table if not exists public.keyword_rankings (
    ranking_id serial primary key,
    keyword_id integer not null references public.keywords(keyword_id) on delete cascade,
    recorded_date date not null,
    rank_position integer not null check (rank_position > 0),
    created_at timestamptz not null default current_timestamp,
    constraint unique_keyword_date unique (keyword_id, recorded_date)
);

create table if not exists public.page_performance (
    performance_id serial primary key,
    location_id integer not null references public.locations(location_id) on delete cascade,
    recorded_date date not null,
    impressions integer not null default 0 check (impressions >= 0),
    clicks integer not null default 0 check (clicks >= 0 and clicks <= impressions),
    ctr numeric(5,4) generated always as (
        case
            when impressions > 0 then clicks::numeric / impressions::numeric
            else 0
        end
    ) stored,
    avg_position numeric(6,2) check (avg_position is null or avg_position > 0),
    organic_users integer not null default 0 check (organic_users >= 0),
    form_submissions integer not null default 0 check (form_submissions >= 0),
    call_clicks integer not null default 0 check (call_clicks >= 0),
    created_at timestamptz not null default current_timestamp,
    constraint unique_location_date unique (location_id, recorded_date)
);

create index if not exists idx_rankings_date
    on public.keyword_rankings(recorded_date);
create index if not exists idx_performance_date
    on public.page_performance(recorded_date);

alter table public.locations enable row level security;
alter table public.keywords enable row level security;
alter table public.keyword_rankings enable row level security;
alter table public.page_performance enable row level security;

revoke all on public.locations, public.keywords, public.keyword_rankings, public.page_performance
    from anon, authenticated;

revoke all on sequence
    public.locations_location_id_seq,
    public.keywords_keyword_id_seq,
    public.keyword_rankings_ranking_id_seq,
    public.page_performance_performance_id_seq
    from anon, authenticated;

grant all on public.locations, public.keywords, public.keyword_rankings, public.page_performance
    to service_role;
grant usage, select on sequence
    public.locations_location_id_seq,
    public.keywords_keyword_id_seq,
    public.keyword_rankings_ranking_id_seq,
    public.page_performance_performance_id_seq
    to service_role;
