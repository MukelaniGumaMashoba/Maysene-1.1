-- ============================================================
-- Workshop Module Redesign V2
-- New workflow statuses, line items, notifications, audit trail
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. Extend workshop_job with new columns
-- ============================================================
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS fleet_number text;
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS trailer_registration text;
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS assigned_to text; -- 'internal' or 'subcontractor'
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS job_source text DEFAULT 'office'; -- 'office', 'defect', 'inspection'
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS assigned_mechanic_id uuid;
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS cancelled_reason text;
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS cancelled_by uuid;
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS quality_check_by uuid;
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS quality_check_at timestamptz;
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- ============================================================
-- 2. Migrate existing status values to new workflow_status
-- ============================================================
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS workflow_status text DEFAULT 'awaiting_assignment';

UPDATE public.workshop_job SET workflow_status = CASE
  WHEN status = 'Awaiting Approval' THEN 'awaiting_assignment'
  WHEN status = 'Approved' THEN 'mechanic_assigned'
  WHEN status = 'Part Assigned' THEN 'parts_outstanding'
  WHEN status = 'Part Ordered' THEN 'parts_outstanding'
  WHEN status = 'Completed' THEN 'quality_check_done'
  WHEN status = 'Rejected' THEN 'job_cancelled'
  WHEN status = 'Awaiting Fleet Approval' THEN 'returned_to_office'
  WHEN lower(status) = 'cancelled' THEN 'job_cancelled'
  WHEN lower(status) = 'completed' THEN 'quality_check_done'
  ELSE 'awaiting_assignment'
END
WHERE workflow_status IS NULL OR workflow_status = '';

-- ============================================================
-- 3. Create job_line_items table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.job_line_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id bigint REFERENCES public.workshop_job(id) ON DELETE CASCADE,
  description text NOT NULL,
  category text DEFAULT 'custom', -- 'Cat A', 'Cat B', 'custom'
  section text DEFAULT 'Additional', -- 'First Check', 'Inside Cabin', 'Outside Cabin', 'Fire & Safety', 'Tyres & Vehicle Condition', 'Additional'
  status text DEFAULT 'Pending', -- 'OK', 'Faulty', 'Pending'
  notes text,
  photos text[],
  invoice_url text,
  completed_by uuid,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_line_items_job_id ON public.job_line_items(job_id);

-- ============================================================
-- 4. Create part_requests table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.part_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id bigint REFERENCES public.workshop_job(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  part_number text,
  quantity integer DEFAULT 1,
  status text DEFAULT 'requested', -- 'requested', 'ordered', 'received', 'cancelled'
  requested_by uuid,
  requested_at timestamptz DEFAULT now(),
  confirmed_by uuid,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_part_requests_job_id ON public.part_requests(job_id);

-- ============================================================
-- 5. Create notifications table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL, -- 'job_assigned', 'parts_outstanding', 'parts_received', 'returned_to_office', 'job_completed', 'quality_check'
  job_id bigint REFERENCES public.workshop_job(id) ON DELETE CASCADE,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- ============================================================
-- 6. Create job_status_history table (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.job_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id bigint REFERENCES public.workshop_job(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  changed_by_role text,
  change_reason text,
  notes text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_history_job_id ON public.job_status_history(job_id);

-- ============================================================
-- 7. Seed line item templates
-- ============================================================
-- Templates are stored in code (src/lib/line-item-templates.ts)
-- No database seeding needed - templates loaded client-side

-- ============================================================
-- 8. Enable RLS on new tables
-- ============================================================
ALTER TABLE public.job_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_status_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. Create permissive policies for authenticated users
-- ============================================================
CREATE POLICY "Allow all for authenticated" ON public.job_line_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON public.part_requests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON public.notifications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON public.job_status_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow anon for development
CREATE POLICY "Allow all for anon" ON public.job_line_items
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON public.part_requests
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON public.notifications
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON public.job_status_history
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- 10. Create function to auto-update workshop_job status
-- ============================================================
CREATE OR REPLACE FUNCTION update_workshop_job_workflow_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When workflow_status changes, update the legacy status column
  IF NEW.workflow_status IS DISTINCT FROM OLD.workflow_status THEN
    NEW.status = CASE
      WHEN NEW.workflow_status = 'awaiting_assignment' THEN 'Awaiting Approval'
      WHEN NEW.workflow_status = 'mechanic_assigned' THEN 'Approved'
      WHEN NEW.workflow_status = 'subcontractor_assigned' THEN 'Approved'
      WHEN NEW.workflow_status = 'mechanic_accepted' THEN 'Approved'
      WHEN NEW.workflow_status = 'job_in_progress' THEN 'In Progress'
      WHEN NEW.workflow_status = 'parts_outstanding' THEN 'Part Assigned'
      WHEN NEW.workflow_status = 'parts_received' THEN 'Part Ordered'
      WHEN NEW.workflow_status = 'returned_to_office' THEN 'Awaiting Fleet Approval'
      WHEN NEW.workflow_status = 'job_completed' THEN 'Completed'
      WHEN NEW.workflow_status = 'quality_check_done' THEN 'Completed'
      WHEN NEW.workflow_status = 'job_cancelled' THEN 'Rejected'
      ELSE NEW.status
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_workflow_status ON public.workshop_job;
CREATE TRIGGER trg_update_workflow_status
  BEFORE UPDATE OF workflow_status ON public.workshop_job
  FOR EACH ROW
  EXECUTE FUNCTION update_workshop_job_workflow_status();

-- ============================================================
-- 11. Create function to insert status history on workflow change
-- ============================================================
CREATE OR REPLACE FUNCTION log_workflow_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.workflow_status IS DISTINCT FROM OLD.workflow_status THEN
    INSERT INTO public.job_status_history (job_id, from_status, to_status, changed_by, notes)
    VALUES (NEW.id, OLD.workflow_status, NEW.workflow_status, auth.uid(), NEW.notes);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_workflow_change ON public.workshop_job;
CREATE TRIGGER trg_log_workflow_change
  AFTER UPDATE OF workflow_status ON public.workshop_job
  FOR EACH ROW
  EXECUTE FUNCTION log_workflow_status_change();

-- ============================================================
-- Done!
-- ============================================================
