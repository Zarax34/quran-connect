-- Add email column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Create index for faster lookup by full_name
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);