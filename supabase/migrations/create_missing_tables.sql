-- ============================================================
-- Missing tables migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. approvals
CREATE TABLE IF NOT EXISTS public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approver_id uuid,
  quotation_id uuid REFERENCES public.quotations(id),
  reason text,
  status text,
  created_at timestamptz DEFAULT now()
);

-- 2. job_card_approvals
CREATE TABLE IF NOT EXISTS public.job_card_approvals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_card_id uuid REFERENCES public.job_cards(id),
  approver_type text,
  status text,
  notes text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 3. job_card_workflow_history
CREATE TABLE IF NOT EXISTS public.job_card_workflow_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_card_id integer REFERENCES public.workshop_job(id),
  from_status text,
  to_status text NOT NULL,
  action_by uuid,
  notes text,
  action_at timestamptz DEFAULT now()
);

-- 4. drivers_klaver
CREATE TABLE IF NOT EXISTS public.drivers_klaver (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name text NOT NULL,
  surname text NOT NULL,
  id_or_passport_number text NOT NULL,
  cell_number text,
  email_address text,
  license_code text,
  license_number text,
  license_expiry_date text,
  driver_restriction_code text,
  vehicle_restriction_code text,
  professional_driving_permit boolean,
  pdp_expiry_date text,
  sa_issued boolean,
  front_of_driver_pic text,
  rear_of_driver_pic text,
  id_or_passport_document text,
  work_permit_upload text,
  user_id uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 5. technicians_klaver
CREATE TABLE IF NOT EXISTS public.technicians_klaver (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  location text NOT NULL,
  vehicle_type text NOT NULL,
  equipment_level text NOT NULL,
  join_date text NOT NULL,
  certifications text[] NOT NULL DEFAULT '{}',
  specialties text[] NOT NULL DEFAULT '{}',
  skill_levels jsonb NOT NULL DEFAULT '{}',
  coordinates jsonb NOT NULL DEFAULT '{}',
  availability text,
  rating numeric,
  status boolean,
  "isActive" boolean,
  type text,
  workshop_id uuid REFERENCES public.workshop(id),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 6. quotations_klaver
CREATE TABLE IF NOT EXISTS public.quotations_klaver (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text,
  issue text,
  status text,
  type text,
  "typeJob" text,
  job_type text,
  priority text,
  reason text,
  orderno text,
  vehiclereg text,
  drivername text,
  laborcost numeric,
  labourcost numeric,
  partscost numeric,
  totalcost numeric,
  "markupPrice" numeric,
  estimate_amount numeric,
  estimated_cost numeric,
  estimated_time text,
  additional_notes text,
  parts_needed text[],
  paid boolean,
  breakdown_id text,
  cost_center_id text,
  job_id integer REFERENCES public.job_assignments(id),
  jobcard_id integer REFERENCES public.job_card(id),
  tech_id integer REFERENCES public.technicians(id),
  created_by uuid REFERENCES public.profiles(id),
  createdat timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 7. workshop_breakdown
CREATE TABLE IF NOT EXISTS public.workshop_breakdown (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workshop_id uuid REFERENCES public.workshop(id),
  vehicle_id integer,
  reported_by integer,
  description text,
  status text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- Enable Row Level Security
-- ============================================================
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_card_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_card_workflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers_klaver ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians_klaver ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations_klaver ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_breakdown ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Permissive policies for authenticated users
-- ============================================================
CREATE POLICY "Allow all for authenticated" ON public.approvals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.job_card_approvals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.job_card_workflow_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.drivers_klaver FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.technicians_klaver FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.quotations_klaver FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.workshop_breakdown FOR ALL TO authenticated USING (true) WITH CHECK (true);
