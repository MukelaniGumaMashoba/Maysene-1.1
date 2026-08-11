-- Add return_reason column to workshop_job (separate from cancelled_reason)
ALTER TABLE workshop_job ADD COLUMN IF NOT EXISTS return_reason TEXT;

-- Add quality_check_passed column if it doesn't exist
ALTER TABLE workshop_job ADD COLUMN IF NOT EXISTS quality_check_passed BOOLEAN DEFAULT false;

-- Add return_reason to the existing workshop_job table
COMMENT ON COLUMN workshop_job.return_reason IS 'Reason when job is returned to office (separate from cancelled_reason)';

-- Verify the column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshop_job' AND column_name = 'return_reason'
  ) THEN
    ALTER TABLE workshop_job ADD COLUMN return_reason TEXT;
  END IF;
END $$;
