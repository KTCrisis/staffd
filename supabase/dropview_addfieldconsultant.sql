drop view if exists consultant_occupancy;

create view consultant_occupancy as
select
  c.id,
  c.name,
  c.initials,
  c.email,
  c.role,
  c.avatar_color,
  c.stack,
  c.status,
  c.tjm,
  c.leave_days_total,
  c.leave_days_taken,
  c.leave_days_total - c.leave_days_taken  as leave_days_left,
  coalesce(sum(a.allocation), 0)           as occupancy_rate,
  array_agg(p.name) filter (where p.name is not null) as project_names
from consultants c
left join assignments a on a.consultant_id = c.id
  and (a.end_date is null or a.end_date >= current_date)
  and (a.start_date is null or a.start_date <= current_date)
left join projects p on p.id = a.project_id
group by c.id, c.name, c.initials, c.email, c.role, c.avatar_color,
         c.stack, c.status, c.tjm, c.leave_days_total, c.leave_days_taken;