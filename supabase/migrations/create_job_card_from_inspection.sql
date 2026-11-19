-- DEPRECATED for new installs: use create_fleet_job_from_inspection.sql instead.
-- That migration creates job_assignments (Job List) and disables this workshop_job path.
-- Kept for history / environments that already applied it.
--
-- Run this in the Supabase SQL Editor.
-- One workshop job card per failed inspection, plus a defect per Faulty checklist item.
-- Safe to re-run: the function does nothing when a card already exists.

ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS inspection_id bigint;
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS job_source text DEFAULT 'office';
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS assigned_mechanic_id uuid;
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS workflow_status text DEFAULT 'awaiting_assignment';
ALTER TABLE public.workshop_job ADD COLUMN IF NOT EXISTS fleet_number text;

CREATE UNIQUE INDEX IF NOT EXISTS workshop_job_inspection_id_uidx
  ON public.workshop_job (inspection_id)
  WHERE inspection_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workshop_job_inspection_id_fkey'
      AND conrelid = 'public.workshop_job'::regclass
  ) THEN
    ALTER TABLE public.workshop_job
      ADD CONSTRAINT workshop_job_inspection_id_fkey
      FOREIGN KEY (inspection_id)
      REFERENCES public.inspections (id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.create_job_card_from_inspection(p_inspection_id bigint)
RETURNS bigint
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_inspection public.inspections%ROWTYPE;
  v_job_id bigint;
  v_registration text;
  v_fleet_number text;
  v_faulty boolean := false;
  v_fault_labels text;
  v_description text;
  v_existing_defects integer;
BEGIN
  SELECT *
  INTO v_inspection
  FROM public.inspections
  WHERE id = p_inspection_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- A second call for the same inspection does nothing.
  SELECT id
  INTO v_job_id
  FROM public.workshop_job
  WHERE inspection_id = p_inspection_id
  LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    RETURN v_job_id;
  END IF;

  IF v_inspection.overall_status = 'Faulty' THEN
    v_faulty := true;
  ELSIF v_inspection.checklist IS NOT NULL
    AND jsonb_typeof(v_inspection.checklist::jsonb) = 'array' THEN
    SELECT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_inspection.checklist::jsonb) AS section
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(section -> 'items') = 'array' THEN section -> 'items'
          ELSE '[]'::jsonb
        END
      ) AS item
      WHERE item ->> 'status' = 'Faulty'
    )
    INTO v_faulty;
  END IF;

  IF NOT v_faulty THEN
    RETURN NULL;
  END IF;

  SELECT v.registration_number, v.fleet_number
  INTO v_registration, v_fleet_number
  FROM public.vehiclesc AS v
  WHERE v.id = v_inspection.vehicle_id;

  SELECT string_agg(coalesce(item ->> 'label', 'Faulty item'), ', ' ORDER BY item ->> 'label')
  INTO v_fault_labels
  FROM jsonb_array_elements(
    CASE
      WHEN v_inspection.checklist IS NOT NULL
        AND jsonb_typeof(v_inspection.checklist::jsonb) = 'array'
      THEN v_inspection.checklist::jsonb
      ELSE '[]'::jsonb
    END
  ) AS section
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(section -> 'items') = 'array' THEN section -> 'items'
      ELSE '[]'::jsonb
    END
  ) AS item
  WHERE item ->> 'status' = 'Faulty';

  v_description := 'Inspection #' || v_inspection.id::text
    || CASE
         WHEN v_fault_labels IS NOT NULL AND v_fault_labels <> '' THEN ': ' || v_fault_labels
         ELSE ''
       END;

  BEGIN
    INSERT INTO public.workshop_job (
      jobid_workshop,
      job_source,
      source,
      workflow_status,
      status,
      assigned_mechanic_id,
      registration_no,
      fleet_number,
      inspection_id,
      driver_id,
      description,
      location,
      odo_reading,
      priority,
      job_type
    )
    VALUES (
      'JC-INSP-' || v_inspection.id::text,
      'inspection',
      'inspection',
      'awaiting_assignment',
      'Awaiting Approval',
      NULL,
      v_registration,
      v_fleet_number,
      v_inspection.id,
      v_inspection.driver_id,
      v_description,
      v_inspection.location,
      v_inspection.odo_reading::text,
      'medium',
      'Inspection'
    )
    RETURNING id INTO v_job_id;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT id
      INTO v_job_id
      FROM public.workshop_job
      WHERE inspection_id = p_inspection_id
      LIMIT 1;
      RETURN v_job_id;
  END;

  SELECT count(*)::integer
  INTO v_existing_defects
  FROM public.defects
  WHERE inspection_id = v_inspection.id;

  IF v_existing_defects > 0 THEN
    -- Link defects already logged for this inspection instead of inserting duplicates.
    UPDATE public.defects
    SET workshop_job_id = v_job_id
    WHERE inspection_id = v_inspection.id
      AND workshop_job_id IS NULL;
  ELSE
    INSERT INTO public.defects (
      inspection_id,
      workshop_job_id,
      vehicle_id,
      driver_id,
      defect_name,
      defect_category,
      defect_description,
      defect_status,
      priority,
      logged_at
    )
    SELECT
      v_inspection.id,
      v_job_id,
      v_inspection.vehicle_id,
      v_inspection.driver_id,
      coalesce(item ->> 'label', 'Faulty item'),
      item ->> 'category',
      coalesce(item ->> 'label', 'Faulty item')
        || ' - flagged as Faulty during Inspection #'
        || v_inspection.id::text,
      'Logged',
      'medium',
      now()
    FROM jsonb_array_elements(
      CASE
        WHEN v_inspection.checklist IS NOT NULL
          AND jsonb_typeof(v_inspection.checklist::jsonb) = 'array'
        THEN v_inspection.checklist::jsonb
        ELSE '[]'::jsonb
      END
    ) AS section
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(section -> 'items') = 'array' THEN section -> 'items'
        ELSE '[]'::jsonb
      END
    ) AS item
    WHERE item ->> 'status' = 'Faulty';
  END IF;

  RETURN v_job_id;
END;
$$;

COMMENT ON FUNCTION public.create_job_card_from_inspection(bigint) IS
  'Creates one awaiting-assignment workshop job and its defects for a Faulty inspection. Repeat calls return the existing job.';

CREATE OR REPLACE FUNCTION public.trg_inspections_create_job_card()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Keep the inspection insert even if the job card cannot be created.
  -- The inspection page can retry the same function.
  BEGIN
    PERFORM public.create_job_card_from_inspection(NEW.id);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'create_job_card_from_inspection failed for inspection %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inspections_create_job_card ON public.inspections;
CREATE TRIGGER inspections_create_job_card
  AFTER INSERT OR UPDATE ON public.inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_inspections_create_job_card();

-- Backfill cards for inspections that are already faulty, including ones
-- whose defects were logged with no workshop job.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT i.id
    FROM public.inspections AS i
    WHERE i.overall_status = 'Faulty'
       OR (
         i.checklist IS NOT NULL
         AND jsonb_typeof(i.checklist::jsonb) = 'array'
         AND EXISTS (
           SELECT 1
           FROM jsonb_array_elements(i.checklist::jsonb) AS section
           CROSS JOIN LATERAL jsonb_array_elements(
             CASE
               WHEN jsonb_typeof(section -> 'items') = 'array' THEN section -> 'items'
               ELSE '[]'::jsonb
             END
           ) AS item
           WHERE item ->> 'status' = 'Faulty'
         )
       )
  LOOP
    BEGIN
      PERFORM public.create_job_card_from_inspection(r.id);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'backfill skipped inspection %: %', r.id, SQLERRM;
    END;
  END LOOP;
END $$;
