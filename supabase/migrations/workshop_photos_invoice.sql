-- ============================================================
-- Workshop Module: Photos, Invoice Upload, Line Item Photos
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. Add photos column to job_line_items
-- ============================================================
ALTER TABLE public.job_line_items ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}';

-- ============================================================
-- 2. Add photos column to workshop_job (job card photos)
-- ============================================================
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}';

-- ============================================================
-- 3. Add invoice_url column to workshop_job (subcontractor invoices)
-- ============================================================
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS invoice_url text;

-- ============================================================
-- 4. Create storage bucket for job attachments
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-attachments', 'job-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. Storage policy: allow authenticated uploads
-- ============================================================
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'job-attachments');

-- ============================================================
-- 6. Storage policy: allow public reads
-- ============================================================
CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'job-attachments');

-- ============================================================
-- 7. Storage policy: allow authenticated deletes
-- ============================================================
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'job-attachments');
