-- Seed service-area reference data only; load keywords and metrics from verified sources.
insert into public.locations (city, state, page_url) values
    ('Lakewood', 'CO', '/service-areas/lakewood-co/'),
    ('Arvada', 'CO', '/service-areas/arvada-co/'),
    ('Wheat Ridge', 'CO', '/service-areas/wheat-ridge-co/')
on conflict do nothing;
