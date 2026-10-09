select
    l.city,
    p.recorded_date,
    p.impressions,
    p.clicks,
    round(p.ctr * 100, 2) as ctr_percentage,
    p.avg_position,
    p.form_submissions + p.call_clicks as total_leads
from public.page_performance as p
join public.locations as l on p.location_id = l.location_id
order by p.recorded_date desc, l.city asc;