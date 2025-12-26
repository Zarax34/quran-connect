-- Create activity_halaqat table to link activities with halaqat
CREATE TABLE public.activity_halaqat (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    halqa_id uuid NOT NULL REFERENCES public.halaqat(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(activity_id, halqa_id)
);

-- Enable RLS
ALTER TABLE public.activity_halaqat ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Activity halaqat viewable by all" 
ON public.activity_halaqat 
FOR SELECT 
USING (true);

CREATE POLICY "Super admin can manage activity halaqat" 
ON public.activity_halaqat 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Center staff can insert activity halaqat" 
ON public.activity_halaqat 
FOR INSERT 
WITH CHECK (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'center_admin') OR has_role(auth.uid(), 'communication_officer'));

CREATE POLICY "Center staff can delete activity halaqat" 
ON public.activity_halaqat 
FOR DELETE 
USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'center_admin') OR has_role(auth.uid(), 'communication_officer'));

-- Create trigger function to send approval requests automatically
CREATE OR REPLACE FUNCTION public.notify_activity_halqa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activity_record RECORD;
  halqa_record RECORD;
  student_record RECORD;
  parent_record RECORD;
  parent_user_id uuid;
BEGIN
  -- Get activity details
  SELECT * INTO activity_record FROM public.activities WHERE id = NEW.activity_id;
  
  -- Only proceed if activity requires approval
  IF NOT activity_record.requires_approval THEN
    RETURN NEW;
  END IF;
  
  -- Get halqa details
  SELECT * INTO halqa_record FROM public.halaqat WHERE id = NEW.halqa_id;
  
  -- Get all active students in this halqa
  FOR student_record IN
    SELECT s.id, s.full_name, s.user_id
    FROM public.students s
    WHERE s.halqa_id = NEW.halqa_id AND s.is_active = true
  LOOP
    -- Get first parent for this student
    SELECT p.id, p.user_id INTO parent_record
    FROM public.student_parents sp
    JOIN public.parents p ON p.id = sp.parent_id
    WHERE sp.student_id = student_record.id
    LIMIT 1;
    
    -- Create approval request if parent exists
    IF parent_record.id IS NOT NULL THEN
      INSERT INTO public.activity_approvals (activity_id, student_id, parent_id, approved)
      VALUES (NEW.activity_id, student_record.id, parent_record.id, NULL)
      ON CONFLICT DO NOTHING;
      
      -- Notify parent if they have a user account
      IF parent_record.user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, content, type, is_read)
        VALUES (
          parent_record.user_id,
          'طلب موافقة على نشاط: ' || activity_record.name,
          'تم تسجيل ابنكم ' || student_record.full_name || ' في نشاط ' || activity_record.name || '. يرجى الموافقة أو الرفض.',
          'activity',
          false
        );
      END IF;
    END IF;
    
    -- Notify student if they have a user account
    IF student_record.user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, content, type, is_read)
      VALUES (
        student_record.user_id,
        'نشاط جديد: ' || activity_record.name,
        'تم تسجيلك في نشاط ' || activity_record.name || ' الذي سيقام بتاريخ ' || activity_record.start_date::text,
        'activity',
        false
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_activity_halqa_insert
AFTER INSERT ON public.activity_halaqat
FOR EACH ROW
EXECUTE FUNCTION public.notify_activity_halqa();