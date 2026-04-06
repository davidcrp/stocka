
-- Add business_type and custom_labels to accounts
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'dealership',
ADD COLUMN IF NOT EXISTS custom_labels jsonb NOT NULL DEFAULT '{}';

-- Add custom_fields and category to vehicles
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS category text;

-- Migrate existing vehicle-specific data into custom_fields for existing records
UPDATE public.vehicles
SET custom_fields = jsonb_build_object(
  'plate', COALESCE(plate, ''),
  'fuel', COALESCE(fuel, ''),
  'transmission', COALESCE(transmission, ''),
  'color', COALESCE(color, ''),
  'mileage', COALESCE(mileage, 0),
  'fipe_code', COALESCE(fipe_code, '')
),
category = 'veículo'
WHERE custom_fields = '{}'::jsonb;
