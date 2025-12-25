-- Create function to notify parents when new report entry is created
CREATE OR REPLACE FUNCTION public.notify_parent_on_report_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_user_id uuid;
  student_name text;
  report_date date;
BEGIN
  -- Get student name
  SELECT full_name INTO student_name
  FROM public.students
  WHERE id = NEW.student_id;

  -- Get report date
  SELECT r.report_date INTO report_date
  FROM public.reports r
  WHERE r.id = NEW.report_id;

  -- Get all parent user_ids for this student
  FOR parent_user_id IN
    SELECT p.user_id
    FROM public.student_parents sp
    JOIN public.parents p ON p.id = sp.parent_id
    WHERE sp.student_id = NEW.student_id
    AND p.user_id IS NOT NULL
  LOOP
    -- Create notification for each parent
    INSERT INTO public.notifications (user_id, title, content, type, link, is_read)
    VALUES (
      parent_user_id,
      'تقرير جديد',
      'تم إضافة تقرير جديد للطالب ' || student_name || ' بتاريخ ' || report_date::text,
      'report',
      '/parent',
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger for new report entries
DROP TRIGGER IF EXISTS on_report_entry_created ON public.report_entries;
CREATE TRIGGER on_report_entry_created
  AFTER INSERT ON public.report_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_parent_on_report_entry();

-- Add RLS policies for notifications if not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications"
      ON public.notifications
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications"
      ON public.notifications
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Enable RLS on notifications if not already
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;