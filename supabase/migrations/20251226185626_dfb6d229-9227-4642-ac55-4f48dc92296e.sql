
-- Create holiday attendance tracking table
CREATE TABLE public.holiday_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  holiday_id UUID NOT NULL REFERENCES public.holidays(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  attended BOOLEAN DEFAULT false,
  notes TEXT,
  marked_at TIMESTAMP WITH TIME ZONE,
  marked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(holiday_id, student_id)
);

-- Enable RLS
ALTER TABLE public.holiday_attendance ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Holiday attendance viewable by all"
ON public.holiday_attendance FOR SELECT
USING (true);

CREATE POLICY "Center staff can manage holiday attendance"
ON public.holiday_attendance FOR ALL
USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'center_admin') OR 
  has_role(auth.uid(), 'communication_officer') OR
  has_role(auth.uid(), 'teacher')
);

-- Function to notify parents and students when a holiday is added to their halqa
CREATE OR REPLACE FUNCTION public.notify_holiday_halqa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  holiday_record RECORD;
  halqa_record RECORD;
  student_record RECORD;
  parent_user_id uuid;
BEGIN
  -- Get holiday details
  SELECT * INTO holiday_record FROM public.holidays WHERE id = NEW.holiday_id;
  
  -- Get halqa details
  SELECT * INTO halqa_record FROM public.halaqat WHERE id = NEW.halqa_id;
  
  -- Notify all students in this halqa
  FOR student_record IN
    SELECT s.id, s.full_name, s.user_id
    FROM public.students s
    WHERE s.halqa_id = NEW.halqa_id AND s.is_active = true
  LOOP
    -- Notify student if they have a user account
    IF student_record.user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, content, type, is_read)
      VALUES (
        student_record.user_id,
        'عطلة جديدة: ' || holiday_record.name,
        'تم إضافة عطلة لحلقة ' || halqa_record.name || ' من ' || holiday_record.start_date || ' إلى ' || holiday_record.end_date || COALESCE(' - السبب: ' || holiday_record.reason, ''),
        'holiday',
        false
      );
    END IF;
    
    -- Notify all parents of this student
    FOR parent_user_id IN
      SELECT p.user_id
      FROM public.student_parents sp
      JOIN public.parents p ON p.id = sp.parent_id
      WHERE sp.student_id = student_record.id AND p.user_id IS NOT NULL
    LOOP
      INSERT INTO public.notifications (user_id, title, content, type, is_read)
      VALUES (
        parent_user_id,
        'عطلة جديدة: ' || holiday_record.name,
        'تم إضافة عطلة لحلقة ' || halqa_record.name || ' التي ينتمي إليها ابنكم ' || student_record.full_name || ' من ' || holiday_record.start_date || ' إلى ' || holiday_record.end_date || COALESCE(' - السبب: ' || holiday_record.reason, ''),
        'holiday',
        false
      );
    END LOOP;
    
    -- Create attendance record for this student
    INSERT INTO public.holiday_attendance (holiday_id, student_id)
    VALUES (NEW.holiday_id, student_record.id)
    ON CONFLICT (holiday_id, student_id) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for holiday notifications
CREATE TRIGGER notify_holiday_halqa_trigger
AFTER INSERT ON public.holiday_halaqat
FOR EACH ROW
EXECUTE FUNCTION public.notify_holiday_halqa();
