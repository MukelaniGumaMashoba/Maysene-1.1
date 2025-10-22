-- Update trailer table with additional fields
ALTER TABLE public.trailer 
ADD COLUMN IF NOT EXISTS make text,
ADD COLUMN IF NOT EXISTS model text,
ADD COLUMN IF NOT EXISTS sub_model text,
ADD COLUMN IF NOT EXISTS manufactured_year text,
ADD COLUMN IF NOT EXISTS trailer_type text DEFAULT 'trailer',
ADD COLUMN IF NOT EXISTS registration_date date,
ADD COLUMN IF NOT EXISTS license_expiry_date date,
ADD COLUMN IF NOT EXISTS purchase_price numeric(12, 2),
ADD COLUMN IF NOT EXISTS retail_price numeric(12, 2),
ADD COLUMN IF NOT EXISTS trailer_priority text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS tank_capacity numeric(10, 2),
ADD COLUMN IF NOT EXISTS take_on_kilometers numeric(10, 2),
ADD COLUMN IF NOT EXISTS service_intervals text,
ADD COLUMN IF NOT EXISTS boarding_km_hours numeric(10, 2),
ADD COLUMN IF NOT EXISTS expected_boarding_date date,
ADD COLUMN IF NOT EXISTS cost_centres text,
ADD COLUMN IF NOT EXISTS colour text,
ADD COLUMN IF NOT EXISTS created_by uuid,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS inspected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS workshop_id uuid,
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS tech_id integer,
ADD COLUMN IF NOT EXISTS company_id bigint,
ADD COLUMN IF NOT EXISTS status text,
ADD COLUMN IF NOT EXISTS available boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS speedo_current integer;

-- Add constraints
ALTER TABLE public.trailer 
ADD CONSTRAINT IF NOT EXISTS trailer_trailer_priority_check 
CHECK (trailer_priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]));

ALTER TABLE public.trailer 
ADD CONSTRAINT IF NOT EXISTS trailer_trailer_type_check 
CHECK (trailer_type = ANY (ARRAY['trailer'::text, 'tanker'::text, 'flatbed'::text, 'container'::text, 'specialized'::text]));

-- Add foreign key constraints
ALTER TABLE public.trailer 
ADD CONSTRAINT IF NOT EXISTS trailer_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users (id);