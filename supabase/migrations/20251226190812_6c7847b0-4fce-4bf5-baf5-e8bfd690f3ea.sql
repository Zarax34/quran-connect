
-- Add parent approval fields to holiday_attendance
ALTER TABLE public.holiday_attendance 
ADD COLUMN parent_approved BOOLEAN DEFAULT NULL,
ADD COLUMN parent_id UUID REFERENCES public.parents(id),
ADD COLUMN parent_response_date TIMESTAMP WITH TIME ZONE;

-- Update the notify function to create attendance records with parent info
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
  parent_record RECORD;
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
    
    -- Get first parent for this student and create attendance record
    SELECT p.id, p.user_id INTO parent_record
    FROM public.student_parents sp
    JOIN public.parents p ON p.id = sp.parent_id
    WHERE sp.student_id = student_record.id
    LIMIT 1;
    
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
        'تم إضافة عطلة لحلقة ' || halqa_record.name || ' التي ينتمي إليها ابنكم ' || student_record.full_name || ' من ' || holiday_record.start_date || ' إلى ' || holiday_record.end_date || COALESCE(' - السبب: ' || holiday_record.reason, '') || ' - يرجى الموافقة أو الرفض',
        'holiday',
        false
      );
    END LOOP;
    
    -- Create attendance record for this student with parent reference
    INSERT INTO public.holiday_attendance (holiday_id, student_id, parent_id)
    VALUES (NEW.holiday_id, student_record.id, parent_record.id)
    ON CONFLICT (holiday_id, student_id) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$;
