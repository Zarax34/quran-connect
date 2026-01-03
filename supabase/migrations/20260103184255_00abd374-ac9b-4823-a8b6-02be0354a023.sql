-- Create a function to get student count per center (public, no auth required)
CREATE OR REPLACE FUNCTION public.get_center_student_counts()
RETURNS TABLE(center_id uuid, student_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.center_id,
    COUNT(*)::bigint as student_count
  FROM public.students s
  WHERE s.is_active = true
  GROUP BY s.center_id
$$;