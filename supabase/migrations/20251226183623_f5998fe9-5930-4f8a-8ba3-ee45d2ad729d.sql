-- Create junction table for holidays and halaqat (many-to-many)
CREATE TABLE public.holiday_halaqat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_id uuid NOT NULL REFERENCES public.holidays(id) ON DELETE CASCADE,
  halqa_id uuid NOT NULL REFERENCES public.halaqat(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(holiday_id, halqa_id)
);

-- Add reason column to holidays table
ALTER TABLE public.holidays ADD COLUMN IF NOT EXISTS reason text;

-- Enable RLS
ALTER TABLE public.holiday_halaqat ENABLE ROW LEVEL SECURITY;

-- RLS Policies for holiday_halaqat
CREATE POLICY "Holiday halaqat viewable by all"
ON public.holiday_halaqat
FOR SELECT
USING (true);

CREATE POLICY "Super admin can manage holiday halaqat"
ON public.holiday_halaqat
FOR ALL
USING (is_super_admin(auth.uid()));

-- Allow center_admin and communication_officer to manage holidays
CREATE POLICY "Center staff can insert holidays"
ON public.holidays
FOR INSERT
WITH CHECK (
  is_super_admin(auth.uid()) 
  OR has_role(auth.uid(), 'center_admin'::app_role) 
  OR has_role(auth.uid(), 'communication_officer'::app_role)
);

CREATE POLICY "Center staff can update holidays"
ON public.holidays
FOR UPDATE
USING (
  is_super_admin(auth.uid()) 
  OR has_role(auth.uid(), 'center_admin'::app_role) 
  OR has_role(auth.uid(), 'communication_officer'::app_role)
);

CREATE POLICY "Center staff can delete holidays"
ON public.holidays
FOR DELETE
USING (
  is_super_admin(auth.uid()) 
  OR has_role(auth.uid(), 'center_admin'::app_role) 
  OR has_role(auth.uid(), 'communication_officer'::app_role)
);

-- Allow center staff to manage holiday_halaqat
CREATE POLICY "Center staff can insert holiday halaqat"
ON public.holiday_halaqat
FOR INSERT
WITH CHECK (
  is_super_admin(auth.uid()) 
  OR has_role(auth.uid(), 'center_admin'::app_role) 
  OR has_role(auth.uid(), 'communication_officer'::app_role)
);

CREATE POLICY "Center staff can delete holiday halaqat"
ON public.holiday_halaqat
FOR DELETE
USING (
  is_super_admin(auth.uid()) 
  OR has_role(auth.uid(), 'center_admin'::app_role) 
  OR has_role(auth.uid(), 'communication_officer'::app_role)
);