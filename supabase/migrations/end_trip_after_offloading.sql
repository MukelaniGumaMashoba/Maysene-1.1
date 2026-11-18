-- Run this in the Supabase SQL Editor.
-- Trips that are already offloading were treated as finished and hidden.
-- Move them to the new completed status so they do not reappear as active
-- offloading cards once the dashboard keeps Offloading visible.
UPDATE public.trips
SET status = 'end-trip-after-offloading'
WHERE lower(btrim(status)) = 'offloading';
