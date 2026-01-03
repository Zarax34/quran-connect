-- Create student_points table to store points
CREATE TABLE public.student_points (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    recitation_id uuid REFERENCES public.recitations(id) ON DELETE CASCADE,
    report_entry_id uuid REFERENCES public.report_entries(id) ON DELETE CASCADE,
    points integer NOT NULL DEFAULT 0,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_points ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Student points viewable by all"
ON public.student_points
FOR SELECT
USING (true);

CREATE POLICY "Super admin can manage student points"
ON public.student_points
FOR ALL
USING (is_super_admin(auth.uid()));

-- Function to get halaqat count per center (public, no auth required)
CREATE OR REPLACE FUNCTION public.get_center_halaqat_counts()
RETURNS TABLE(center_id uuid, halaqat_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    h.center_id,
    COUNT(*)::bigint as halaqat_count
  FROM public.halaqat h
  WHERE h.is_active = true
  GROUP BY h.center_id
$$;

-- Function to calculate points for a recitation
CREATE OR REPLACE FUNCTION public.calculate_recitation_points(
    _recitation_type text,
    _from_ayah integer,
    _to_ayah integer,
    _grade integer
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    base_points integer := 0;
    ayah_count integer;
    page_estimate numeric;
    grade_multiplier numeric := 1.0;
BEGIN
    -- Calculate ayah count
    ayah_count := _to_ayah - _from_ayah + 1;
    
    -- Estimate pages (approximately 15 ayahs per page)
    page_estimate := GREATEST(ayah_count / 15.0, 0.5);
    
    -- Base points by recitation type
    CASE _recitation_type
        WHEN 'new_memorization' THEN base_points := 10; -- حفظ جديد
        WHEN 'review' THEN base_points := 5; -- مراجعة
        WHEN 'recitation' THEN base_points := 3; -- تسميع
        WHEN 'talqeen' THEN base_points := 2; -- تلقين
        ELSE base_points := 1;
    END CASE;
    
    -- Grade multiplier (grade is out of 10)
    IF _grade IS NOT NULL AND _grade > 0 THEN
        grade_multiplier := _grade / 10.0;
    END IF;
    
    -- Calculate total points: base * pages * grade_multiplier
    RETURN ROUND(base_points * page_estimate * grade_multiplier);
END;
$$;

-- Function to get attendance points
CREATE OR REPLACE FUNCTION public.get_attendance_points(_status text)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
    CASE _status
        WHEN 'present' THEN RETURN 5; -- حاضر
        WHEN 'absent_with_permission' THEN RETURN 2; -- غياب بإذن
        WHEN 'absent' THEN RETURN 0; -- غائب
        WHEN 'escaped' THEN RETURN -5; -- هروب (نقاط سالبة)
        ELSE RETURN 0;
    END CASE;
END;
$$;

-- Trigger function to auto-calculate points when recitation is inserted
CREATE OR REPLACE FUNCTION public.auto_calculate_recitation_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    student_id_val uuid;
    points_val integer;
    reason_text text;
BEGIN
    -- Get student_id from report_entry
    SELECT re.student_id INTO student_id_val
    FROM public.report_entries re
    WHERE re.id = NEW.report_entry_id;
    
    IF student_id_val IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Calculate points
    points_val := public.calculate_recitation_points(
        NEW.type::text,
        NEW.from_ayah,
        NEW.to_ayah,
        NEW.grade
    );
    
    -- Build reason text
    CASE NEW.type::text
        WHEN 'new_memorization' THEN reason_text := 'حفظ جديد';
        WHEN 'review' THEN reason_text := 'مراجعة';
        WHEN 'recitation' THEN reason_text := 'تسميع';
        WHEN 'talqeen' THEN reason_text := 'تلقين';
        ELSE reason_text := 'تسميع';
    END CASE;
    
    reason_text := reason_text || ' - سورة ' || NEW.surah || ' (' || NEW.from_ayah || '-' || NEW.to_ayah || ')';
    
    -- Insert points record
    INSERT INTO public.student_points (student_id, recitation_id, report_entry_id, points, reason)
    VALUES (student_id_val, NEW.id, NEW.report_entry_id, points_val, reason_text);
    
    RETURN NEW;
END;
$$;

-- Trigger function to auto-calculate attendance points
CREATE OR REPLACE FUNCTION public.auto_calculate_attendance_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    points_val integer;
    reason_text text;
BEGIN
    -- Only calculate if attendance_status is set
    IF NEW.attendance_status IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get points for attendance
    points_val := public.get_attendance_points(NEW.attendance_status::text);
    
    -- Build reason text
    CASE NEW.attendance_status::text
        WHEN 'present' THEN reason_text := 'نقاط الحضور';
        WHEN 'absent_with_permission' THEN reason_text := 'غياب بإذن';
        WHEN 'absent' THEN reason_text := 'غياب';
        WHEN 'escaped' THEN reason_text := 'هروب (خصم نقاط)';
        ELSE reason_text := 'حضور';
    END CASE;
    
    -- Insert points record (avoid duplicates for same report_entry)
    INSERT INTO public.student_points (student_id, report_entry_id, points, reason)
    VALUES (NEW.student_id, NEW.id, points_val, reason_text)
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_auto_recitation_points
AFTER INSERT ON public.recitations
FOR EACH ROW
EXECUTE FUNCTION public.auto_calculate_recitation_points();

CREATE TRIGGER trigger_auto_attendance_points
AFTER INSERT ON public.report_entries
FOR EACH ROW
EXECUTE FUNCTION public.auto_calculate_attendance_points();

-- Function to get total points for a student
CREATE OR REPLACE FUNCTION public.get_student_total_points(_student_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(SUM(points), 0)::integer
    FROM public.student_points
    WHERE student_id = _student_id
$$;

-- Function to get student points with details
CREATE OR REPLACE FUNCTION public.get_student_points_details(_student_id uuid)
RETURNS TABLE(
    id uuid,
    points integer,
    reason text,
    created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT sp.id, sp.points, sp.reason, sp.created_at
    FROM public.student_points sp
    WHERE sp.student_id = _student_id
    ORDER BY sp.created_at DESC
    LIMIT 100
$$;