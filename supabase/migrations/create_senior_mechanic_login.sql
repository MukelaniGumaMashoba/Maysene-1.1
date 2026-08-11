-- Create Senior Mechanic login
-- Run in Supabase SQL Editor

-- Step 1: Create auth user
DO $$
BEGIN
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
END $$;

-- Step 2: Create identity
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = '00000000-0000-0000-0000-000000000002') THEN
    INSERT INTO auth.identities (user_id, provider, provider_id, identity_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000002', 'email', 'senior-mechanic@maysene.local', 
            '{"sub": "00000000-0000-0000-0000-000000000002", "email": "senior-mechanic@maysene.local"}', now(), now());
  END IF;
END $$;

-- Step 3: Create users table entry
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000002') THEN
    INSERT INTO public.users (id, email, role)
    VALUES ('00000000-0000-0000-0000-000000000002', 'senior-mechanic@maysene.local', 'senior-mechanic');
  END IF;
END $$;

-- Verify
SELECT u.id, u.email, u.role FROM public.users u WHERE u.email = 'senior-mechanic@maysene.local';
