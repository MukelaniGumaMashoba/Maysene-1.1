-- Prefer fleet Job List records (job_assignments) over workshop_job for
-- inspection faults. Safe to re-run.
-- The inspection detail UI creates job_assignments on demand; this migration
-- disables the earlier auto workshop_job trigger/function path.

DROP TRIGGER IF EXISTS inspections_create_job_card ON public.inspections;

CREATE OR REPLACE FUNCTION public.create_job_card_from_inspection(p_inspection_id bigint)
RETURNS bigint
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_inspection public.inspections%ROWTYPE;
  v_job_id bigint;
  v_faulty boolean := false;
  v_fault_labels text;
  v_description text;
  v_job_number text;
  v_client_name text;
BEGIN
  SELECT *
  INTO v_inspection
  FROM public.inspections
  WHERE id = p_inspection_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Return existing fleet job for this inspection when notes carry inspection_id.
  SELECT ja.id
  INTO v_job_id
  FROM public.job_assignments AS ja
  WHERE ja.service = 'inspection-fault'
    AND ja.notes IS NOT NULL
    AND (
      ja.notes::jsonb ->> 'inspection_id' = p_inspection_id::text
      OR ja.notes LIKE '%"inspection_id":' || p_inspection_id::text || '%'
      OR ja.notes LIKE '%"inspection_id": ' || p_inspection_id::text || '%'
    )
  ORDER BY ja.created_at DESC
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
         WHEN v_fault_labels IS NOT NULL AND v_fault_labels <> '' THEN ' faults: ' || v_fault_labels
         ELSE ' faults'
       END;

  v_job_number := 'INSP-' || extract(year from now())::text || '-' || lpad(v_inspection.id::text, 4, '0');

  SELECT trim(both ' ' from coalesce(d.first_name, '') || ' ' || coalesce(d.surname, ''))
  INTO v_client_name
  FROM public.drivers AS d
  WHERE d.id = v_inspection.driver_id;

  INSERT INTO public.job_assignments (
    job_id,
    description,
    status,
    priority,
    breakdown_req,
    inspected,
    service,
    vehicle_id,
    driver_id,
    location,
    client_type,
    client_name,
    notes
  )
  VALUES (
    v_job_number,
    v_description,
    'Breakdown Request',
    'medium',
    true,
    true,
    'inspection-fault',
    v_inspection.vehicle_id,
    v_inspection.driver_id,
    v_inspection.location,
    'internal',
    NULLIF(v_client_name, ''),
    json_build_object('inspection_id', v_inspection.id)::text
  )
  RETURNING id INTO v_job_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.defects WHERE inspection_id = v_inspection.id
  ) THEN
    INSERT INTO public.defects (
      inspection_id,
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
  'Creates one job_assignments (Job List) row for a Faulty inspection. Does not create workshop_job. Repeat calls return the existing job.';

-- Keep the trigger function but do not re-attach it. Job creation is intentional
-- via the inspection UI button (or an explicit RPC call).
CREATE OR REPLACE FUNCTION public.trg_inspections_create_job_card()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;
