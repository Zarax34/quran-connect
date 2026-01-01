-- Add contact fields to centers table
ALTER TABLE public.centers 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;