-- Drop old constraint that only allows gerente/vendedor
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;

-- Add new constraint with admin role included
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['admin'::text, 'gestor'::text, 'gerente'::text, 'vendedor'::text]));

-- Now set the owner as admin
ALTER TABLE public.profiles DISABLE TRIGGER prevent_role_change_trigger;

UPDATE public.profiles 
SET role = 'admin' 
WHERE user_id = 'a5904f9e-fd63-4ea2-b701-cc071f474f5b';

ALTER TABLE public.profiles ENABLE TRIGGER prevent_role_change_trigger;