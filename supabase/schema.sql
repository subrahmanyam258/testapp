-- =====================================================================
-- Hum Safar — database schema (Supabase / Postgres + PostGIS)
-- Free, cost-sharing carpool app. No payments in this version.
-- =====================================================================
create extension if not exists postgis with schema extensions;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Traveller',
  bio text,
  hue int not null default (floor(random() * 360))::int,
  rating_avg numeric(3,2) not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- rides ----------
create table public.rides (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  origin_name text not null,
  origin_lat double precision not null,
  origin_lng double precision not null,
  dest_name text not null,
  dest_lat double precision not null,
  dest_lng double precision not null,
  depart_at timestamptz not null,
  seats_total int not null check (seats_total between 1 and 8),
  seats_left int not null,
  price_per_seat int not null check (price_per_seat between 0 and 20000),
  distance_km numeric(7,1),
  duration_min int,
  vehicle text,
  notes text,
  route extensions.geography(LineString, 4326),
  status text not null default 'open' check (status in ('open', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint seats_left_range check (seats_left between 0 and seats_total)
);
create index rides_route_gix on public.rides using gist (route);
create index rides_depart_idx on public.rides (depart_at) where status = 'open';
create index rides_driver_idx on public.rides (driver_id);

-- ---------- seat requests ----------
create table public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  rider_id uuid not null references public.profiles(id) on delete cascade,
  seats int not null default 1 check (seats between 1 and 8),
  message text check (message is null or char_length(message) <= 300),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ride_id, rider_id)
);
create index ride_requests_rider_idx on public.ride_requests (rider_id);

-- ---------- chat ----------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index messages_ride_idx on public.messages (ride_id, created_at);

-- ---------- reviews ----------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (ride_id, reviewer_id, reviewee_id),
  check (reviewer_id <> reviewee_id)
);

-- =====================================================================
-- Helper functions
-- =====================================================================
create or replace function public.is_ride_member(p_ride uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from rides where id = p_ride and driver_id = auth.uid())
      or exists (select 1 from ride_requests
                 where ride_id = p_ride and rider_id = auth.uid()
                   and status in ('pending', 'approved'));
$$;

create or replace function public.can_review(p_ride uuid, p_reviewer uuid, p_reviewee uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from rides r
    where r.id = p_ride and r.status = 'open' and r.depart_at < now()
      and (
        (r.driver_id = p_reviewer and exists (
           select 1 from ride_requests q
           where q.ride_id = r.id and q.rider_id = p_reviewee and q.status = 'approved'))
        or
        (r.driver_id = p_reviewee and exists (
           select 1 from ride_requests q
           where q.ride_id = r.id and q.rider_id = p_reviewer and q.status = 'approved'))
      )
  );
$$;

-- =====================================================================
-- Triggers
-- =====================================================================
-- new auth user -> profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id,
          coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''),
                   split_part(new.email, '@', 1), 'Traveller'));
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- users can't edit their own rating
create or replace function public.profiles_guard()
returns trigger language plpgsql as $$
begin
  if pg_trigger_depth() = 1 and auth.uid() is not null then
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
    new.id := old.id;
  end if;
  return new;
end $$;
create trigger profiles_guard_trg before update on public.profiles
  for each row execute function public.profiles_guard();

-- drivers may only cancel / edit notes+vehicle of their ride
create or replace function public.rides_guard()
returns trigger language plpgsql as $$
begin
  if pg_trigger_depth() = 1 and auth.uid() is not null then
    if (new.driver_id, new.origin_name, new.origin_lat, new.origin_lng, new.dest_name,
        new.dest_lat, new.dest_lng, new.depart_at, new.seats_total, new.seats_left,
        new.price_per_seat, new.route)
       is distinct from
       (old.driver_id, old.origin_name, old.origin_lat, old.origin_lng, old.dest_name,
        old.dest_lat, old.dest_lng, old.depart_at, old.seats_total, old.seats_left,
        old.price_per_seat, old.route) then
      raise exception 'Only status, notes and vehicle can be changed on a ride';
    end if;
    if old.status = 'cancelled' and new.status <> 'cancelled' then
      raise exception 'A cancelled ride cannot be reopened';
    end if;
  end if;
  return new;
end $$;
create trigger rides_guard_trg before update on public.rides
  for each row execute function public.rides_guard();

-- who may move a request to which state
create or replace function public.requests_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_driver uuid;
begin
  if auth.uid() is null then return new; end if;
  select driver_id into v_driver from rides where id = old.ride_id;

  if new.ride_id <> old.ride_id or new.rider_id <> old.rider_id then
    raise exception 'Request ride/rider cannot change';
  end if;

  if auth.uid() = old.rider_id then
    if new.status = old.status then
      if old.status <> 'pending' and (new.seats <> old.seats) then
        raise exception 'Seats can only change while pending';
      end if;
    elsif (old.status in ('pending', 'approved') and new.status = 'cancelled')
       or (old.status in ('cancelled', 'declined') and new.status = 'pending'
           and not exists (select 1 from rides where id = old.ride_id and status <> 'open')) then
      null;
    else
      raise exception 'Not allowed: % -> %', old.status, new.status;
    end if;
  elsif auth.uid() = v_driver then
    if new.seats <> old.seats or new.message is distinct from old.message then
      raise exception 'Drivers cannot edit a rider''s request';
    end if;
    if not ((old.status = 'pending' and new.status in ('approved', 'declined'))
         or (old.status = 'approved' and new.status = 'declined')
         or new.status = old.status) then
      raise exception 'Not allowed: % -> %', old.status, new.status;
    end if;
  else
    raise exception 'Not allowed';
  end if;

  new.updated_at := now();
  return new;
end $$;
create trigger requests_guard_trg before update on public.ride_requests
  for each row execute function public.requests_guard();

-- keep seats_left in sync with approvals
create or replace function public.requests_seats()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status <> 'approved' and new.status = 'approved' then
    update rides set seats_left = seats_left - new.seats
     where id = new.ride_id and seats_left >= new.seats and status = 'open';
    if not found then raise exception 'Not enough seats left on this ride'; end if;
  elsif old.status = 'approved' and new.status <> 'approved' then
    update rides set seats_left = least(seats_total, seats_left + old.seats)
     where id = new.ride_id;
  end if;
  return new;
end $$;
create trigger requests_seats_trg after update of status on public.ride_requests
  for each row execute function public.requests_seats();

-- rating roll-up
create or replace function public.reviews_rollup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update profiles p set
    rating_avg = coalesce((select round(avg(stars)::numeric, 2) from reviews where reviewee_id = new.reviewee_id), 0),
    rating_count = (select count(*) from reviews where reviewee_id = new.reviewee_id)
  where p.id = new.reviewee_id;
  return new;
end $$;
create trigger reviews_rollup_trg after insert on public.reviews
  for each row execute function public.reviews_rollup();

-- =====================================================================
-- RPC: publish + search
-- =====================================================================
create or replace function public.publish_ride(
  p_origin_name text, p_origin_lat double precision, p_origin_lng double precision,
  p_dest_name text, p_dest_lat double precision, p_dest_lng double precision,
  p_depart_at timestamptz, p_seats int, p_price int,
  p_distance_km numeric default null, p_duration_min int default null,
  p_vehicle text default null, p_notes text default null,
  p_route_geojson text default null
) returns uuid language plpgsql set search_path = public, extensions as $$
declare v_route geography; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  begin
    if p_route_geojson is not null then
      v_route := ST_GeomFromGeoJSON(p_route_geojson)::geography;
    end if;
  exception when others then v_route := null;
  end;
  if v_route is null then
    v_route := ST_MakeLine(ST_SetSRID(ST_MakePoint(p_origin_lng, p_origin_lat), 4326),
                           ST_SetSRID(ST_MakePoint(p_dest_lng, p_dest_lat), 4326))::geography;
  end if;
  insert into rides (driver_id, origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng,
                     depart_at, seats_total, seats_left, price_per_seat, distance_km, duration_min,
                     vehicle, notes, route)
  values (auth.uid(), p_origin_name, p_origin_lat, p_origin_lng, p_dest_name, p_dest_lat, p_dest_lng,
          p_depart_at, p_seats, p_seats, p_price, p_distance_km, p_duration_min,
          nullif(trim(p_vehicle), ''), nullif(trim(p_notes), ''), v_route)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.search_rides(
  p_from_lat double precision, p_from_lng double precision,
  p_to_lat double precision, p_to_lng double precision,
  p_date date default null, p_seats int default 1, p_radius_m int default 8000
) returns setof jsonb language sql stable set search_path = public, extensions as $$
  with pts as (
    select ST_SetSRID(ST_MakePoint(p_from_lng, p_from_lat), 4326) as f,
           ST_SetSRID(ST_MakePoint(p_to_lng, p_to_lat), 4326) as t
  )
  select (to_jsonb(r) - 'route') || jsonb_build_object('driver', jsonb_build_object(
           'id', p.id, 'full_name', p.full_name, 'hue', p.hue,
           'rating_avg', p.rating_avg, 'rating_count', p.rating_count))
  from rides r
  join profiles p on p.id = r.driver_id, pts
  where r.status = 'open'
    and r.depart_at > now()
    and r.seats_left >= p_seats
    and (p_date is null or (r.depart_at at time zone 'Asia/Kolkata')::date = p_date)
    and ST_DWithin(r.route, pts.f::geography, p_radius_m)
    and ST_DWithin(r.route, pts.t::geography, p_radius_m)
    and ST_LineLocatePoint(r.route::geometry, pts.f) < ST_LineLocatePoint(r.route::geometry, pts.t)
  order by r.depart_at
  limit 50;
$$;

-- =====================================================================
-- Row level security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.rides enable row level security;
alter table public.ride_requests enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;

create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "own profile update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "rides readable" on public.rides for select to authenticated using (true);
create policy "driver publishes" on public.rides for insert to authenticated
  with check (driver_id = (select auth.uid()) and status = 'open' and seats_left = seats_total
              and depart_at > now() - interval '10 minutes');
create policy "driver edits ride" on public.rides for update to authenticated
  using (driver_id = (select auth.uid())) with check (driver_id = (select auth.uid()));

create policy "request visible to parties" on public.ride_requests for select to authenticated
  using (rider_id = (select auth.uid())
         or exists (select 1 from public.rides r where r.id = ride_id and r.driver_id = (select auth.uid())));
create policy "rider requests a seat" on public.ride_requests for insert to authenticated
  with check (rider_id = (select auth.uid()) and status = 'pending'
              and exists (select 1 from public.rides r
                          where r.id = ride_id and r.driver_id <> (select auth.uid())
                            and r.status = 'open' and r.depart_at > now() and r.seats_left >= seats));
create policy "parties update request" on public.ride_requests for update to authenticated
  using (rider_id = (select auth.uid())
         or exists (select 1 from public.rides r where r.id = ride_id and r.driver_id = (select auth.uid())))
  with check (rider_id = (select auth.uid())
         or exists (select 1 from public.rides r where r.id = ride_id and r.driver_id = (select auth.uid())));

create policy "members read chat" on public.messages for select to authenticated
  using (public.is_ride_member(ride_id));
create policy "members send chat" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_ride_member(ride_id));

create policy "reviews readable" on public.reviews for select to authenticated using (true);
create policy "participants review" on public.reviews for insert to authenticated
  with check (reviewer_id = (select auth.uid()) and public.can_review(ride_id, reviewer_id, reviewee_id));

-- =====================================================================
-- Privileges: signed-in users only
-- =====================================================================
revoke all on all tables in schema public from anon;
revoke execute on function public.is_ride_member(uuid) from public, anon;
revoke execute on function public.can_review(uuid, uuid, uuid) from public, anon;
revoke execute on function public.publish_ride(text, double precision, double precision, text, double precision, double precision, timestamptz, int, int, numeric, int, text, text, text) from public, anon;
revoke execute on function public.search_rides(double precision, double precision, double precision, double precision, date, int, int) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.requests_guard() from public, anon, authenticated;
revoke execute on function public.requests_seats() from public, anon, authenticated;
revoke execute on function public.reviews_rollup() from public, anon, authenticated;
grant execute on function public.is_ride_member(uuid) to authenticated;
grant execute on function public.can_review(uuid, uuid, uuid) to authenticated;
grant execute on function public.publish_ride(text, double precision, double precision, text, double precision, double precision, timestamptz, int, int, numeric, int, text, text, text) to authenticated;
grant execute on function public.search_rides(double precision, double precision, double precision, double precision, date, int, int) to authenticated;

-- =====================================================================
-- Realtime (chat + live request updates)
-- =====================================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.ride_requests;
