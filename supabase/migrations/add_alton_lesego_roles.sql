-- Update roles in users table
UPDATE public.users 
SET role = 'senior-mechanic'
WHERE id = 'de002f54-91f8-47bd-b745-f17ca3a76920';

UPDATE public.users 
SET role = 'mechanic'
WHERE id = 'c853aaaa-31aa-4278-b10b-f13db9dc2d83';

-- Insert Alton into technicians_maysene
INSERT INTO public.technicians_maysene (
  name,
  phone,
  email,
  location,
  coordinates,
  specialties,
  skill_levels,
  rating,
  join_date,
  certifications,
  vehicle_type,
  equipment_level,
  status,
  type,
  "isActive",
  created_by
) VALUES (
  'Alton Madzhiabada',
  '+27 68 587 3965',
  'altonmadzhiabada95@gmail.com',
  '',
  '{}',
  '{}',
  '{}',
  0,
  CURRENT_DATE,
  '{}',
  '',
  'basic',
  true,
  'internal',
  true,
  'de002f54-91f8-47bd-b745-f17ca3a76920'
);

-- Insert Lesego into technicians_maysene
INSERT INTO public.technicians_maysene (
  name,
  phone,
  email,
  location,
  coordinates,
  specialties,
  skill_levels,
  rating,
  join_date,
  certifications,
  vehicle_type,
  equipment_level,
  status,
  type,
  "isActive",
  created_by
) VALUES (
  'Lesego Majola',
  '+27 76 552 9085',
  'majolalesego417@gmail.com',
  '',
  '{}',
  '{}',
  '{}',
  0,
  CURRENT_DATE,
  '{}',
  '',
  'basic',
  true,
  'internal',
  true,
  'de002f54-91f8-47bd-b745-f17ca3a76920'
);

-- Verify
SELECT id, email, role FROM public.users 
WHERE id IN ('de002f54-91f8-47bd-b745-f17ca3a76920', 'c853aaaa-31aa-4278-b10b-f13db9dc2d83');

SELECT id, name, email, type, "isActive" FROM public.technicians_maysene
WHERE email IN ('altonmadzhiabada95@gmail.com', 'majolalesego417@gmail.com');
