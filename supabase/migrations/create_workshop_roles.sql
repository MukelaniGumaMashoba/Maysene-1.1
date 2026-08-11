-- ============================================================
-- Create Workshop Roles with Auth Users
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Create auth users (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, 
      email_confirmed_at, created_at, updated_at, 
      confirmation_token, email_change_token_current, recovery_token,
      raw_app_meta_data, raw_user_meta_data
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000001',
      'authenticated', 'authenticated',
      'office@maysene.local',
      crypt('password@12', gen_salt('bf')),
      now(), now(), now(),
      '', '', '',
      '{"provider": "email", "providers": ["email"]}',
      '{"role": "office"}'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000002') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, 
      email_confirmed_at, created_at, updated_at, 
      confirmation_token, email_change_token_current, recovery_token,
      raw_app_meta_data, raw_user_meta_data
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000002',
      'authenticated', 'authenticated',
      'senior-mechanic@maysene.local',
      crypt('password@12', gen_salt('bf')),
      now(), now(), now(),
      '', '', '',
      '{"provider": "email", "providers": ["email"]}',
      '{"role": "senior-mechanic"}'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000003') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, 
      email_confirmed_at, created_at, updated_at, 
      confirmation_token, email_change_token_current, recovery_token,
      raw_app_meta_data, raw_user_meta_data
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000003',
      'authenticated', 'authenticated',
      'mechanic@maysene.local',
      crypt('password@12', gen_salt('bf')),
      now(), now(), now(),
      '', '', '',
      '{"provider": "email", "providers": ["email"]}',
      '{"role": "mechanic"}'
    );
  END IF;
END $$;

-- Step 2: Insert identities (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = '00000000-0000-0000-0000-000000000001') THEN
    INSERT INTO auth.identities (user_id, provider, provider_id, identity_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000001', 'email', 'office@maysene.local', 
            '{"sub": "00000000-0000-0000-0000-000000000001", "email": "office@maysene.local"}', now(), now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = '00000000-0000-0000-0000-000000000002') THEN
    INSERT INTO auth.identities (user_id, provider, provider_id, identity_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000002', 'email', 'senior-mechanic@maysene.local', 
            '{"sub": "00000000-0000-0000-0000-000000000002", "email": "senior-mechanic@maysene.local"}', now(), now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = '00000000-0000-0000-0000-000000000003') THEN
    INSERT INTO auth.identities (user_id, provider, provider_id, identity_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000003', 'email', 'mechanic@maysene.local', 
            '{"sub": "00000000-0000-0000-0000-000000000003", "email": "mechanic@maysene.local"}', now(), now());
  END IF;
END $$;

-- Step 3: Insert users table entries (skip if already exists)
-- Note: users table has no full_name column
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    INSERT INTO public.users (id, email, role)
    VALUES ('00000000-0000-0000-0000-000000000001', 'office@maysene.local', 'office');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000002') THEN
    INSERT INTO public.users (id, email, role)
    VALUES ('00000000-0000-0000-0000-000000000002', 'senior-mechanic@maysene.local', 'senior-mechanic');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000003') THEN
    INSERT INTO public.users (id, email, role)
    VALUES ('00000000-0000-0000-0000-000000000003', 'mechanic@maysene.local', 'mechanic');
  END IF;
END $$;

-- Verify
SELECT id, email, role FROM public.users 
WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');
