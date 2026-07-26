-- Enable RLS on drivers table
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read drivers
CREATE POLICY "Allow authenticated read drivers"
  ON public.drivers
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert drivers
CREATE POLICY "Allow authenticated insert drivers"
  ON public.drivers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update drivers
CREATE POLICY "Allow authenticated update drivers"
  ON public.drivers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete drivers
CREATE POLICY "Allow authenticated delete drivers"
  ON public.drivers
  FOR DELETE
  TO authenticated
  USING (true);
