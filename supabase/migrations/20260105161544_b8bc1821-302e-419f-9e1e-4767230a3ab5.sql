
-- Fix RLS policies to properly separate data by center

-- Helper function to get center_id from halqa
CREATE OR REPLACE FUNCTION public.get_halqa_center_id(_halqa_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT center_id FROM public.halaqat WHERE id = _halqa_id
$$;

-- Helper function to get center_id from student
CREATE OR REPLACE FUNCTION public.get_student_center_id(_student_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT center_id FROM public.students WHERE id = _student_id
$$;

-- Fix announcements - should only show center-specific announcements
DROP POLICY IF EXISTS "Announcements viewable by all" ON public.announcements;
CREATE POLICY "Announcements viewable by center members" ON public.announcements
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid()) 
    OR center_id IS NULL 
    OR can_access_center(auth.uid(), center_id)
  );

-- Fix activity_approvals - filter by center through activity
DROP POLICY IF EXISTS "Activity approvals viewable" ON public.activity_approvals;
CREATE POLICY "Activity approvals viewable by center members" ON public.activity_approvals
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_approvals.activity_id
      AND can_access_center(auth.uid(), a.center_id)
    )
    OR EXISTS (
      SELECT 1 FROM parents p
      WHERE p.id = activity_approvals.parent_id
      AND p.user_id = auth.uid()
    )
  );

-- Fix activity_halaqat - filter by center
DROP POLICY IF EXISTS "Activity halaqat viewable by all" ON public.activity_halaqat;
CREATE POLICY "Activity halaqat viewable by center members" ON public.activity_halaqat
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM halaqat h
      WHERE h.id = activity_halaqat.halqa_id
      AND can_access_center(auth.uid(), h.center_id)
    )
  );

-- Fix course_registrations - filter by center through course
DROP POLICY IF EXISTS "Course registrations viewable" ON public.course_registrations;
CREATE POLICY "Course registrations viewable by center members" ON public.course_registrations
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_registrations.course_id
      AND can_access_center(auth.uid(), c.center_id)
    )
  );

-- Fix fee_payments - filter by center through fee
DROP POLICY IF EXISTS "Fee payments viewable" ON public.fee_payments;
CREATE POLICY "Fee payments viewable by center members" ON public.fee_payments
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM fees f
      WHERE f.id = fee_payments.fee_id
      AND can_access_center(auth.uid(), f.center_id)
    )
  );

-- Fix halqa_badges - filter by center through halqa
DROP POLICY IF EXISTS "Halqa badges viewable" ON public.halqa_badges;
CREATE POLICY "Halqa badges viewable by center members" ON public.halqa_badges
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM halaqat h
      WHERE h.id = halqa_badges.halqa_id
      AND can_access_center(auth.uid(), h.center_id)
    )
  );

-- Fix halqa_points - filter by center through halqa
DROP POLICY IF EXISTS "Halqa points viewable" ON public.halqa_points;
CREATE POLICY "Halqa points viewable by center members" ON public.halqa_points
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM halaqat h
      WHERE h.id = halqa_points.halqa_id
      AND can_access_center(auth.uid(), h.center_id)
    )
  );

-- Fix halqa_purchase_votes - filter by center through halqa
DROP POLICY IF EXISTS "Votes viewable" ON public.halqa_purchase_votes;
CREATE POLICY "Votes viewable by center members" ON public.halqa_purchase_votes
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM halaqat h
      WHERE h.id = halqa_purchase_votes.halqa_id
      AND can_access_center(auth.uid(), h.center_id)
    )
  );

-- Fix holiday_attendance - filter by center
DROP POLICY IF EXISTS "Holiday attendance viewable by all" ON public.holiday_attendance;
CREATE POLICY "Holiday attendance viewable by center members" ON public.holiday_attendance
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = holiday_attendance.student_id
      AND can_access_center(auth.uid(), s.center_id)
    )
    OR EXISTS (
      SELECT 1 FROM parents p
      WHERE p.id = holiday_attendance.parent_id
      AND p.user_id = auth.uid()
    )
  );

-- Fix holiday_halaqat - filter by center
DROP POLICY IF EXISTS "Holiday halaqat viewable by all" ON public.holiday_halaqat;
CREATE POLICY "Holiday halaqat viewable by center members" ON public.holiday_halaqat
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM halaqat h
      WHERE h.id = holiday_halaqat.halqa_id
      AND can_access_center(auth.uid(), h.center_id)
    )
  );

-- Fix recitations - filter by center through report_entry -> report -> halqa
DROP POLICY IF EXISTS "Recitations viewable" ON public.recitations;
CREATE POLICY "Recitations viewable by center members" ON public.recitations
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM report_entries re
      JOIN reports r ON r.id = re.report_id
      JOIN halaqat h ON h.id = r.halqa_id
      WHERE re.id = recitations.report_entry_id
      AND can_access_center(auth.uid(), h.center_id)
    )
  );

-- Fix report_entries - filter by center through report -> halqa
DROP POLICY IF EXISTS "Report entries viewable" ON public.report_entries;
CREATE POLICY "Report entries viewable by center members" ON public.report_entries
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM reports r
      JOIN halaqat h ON h.id = r.halqa_id
      WHERE r.id = report_entries.report_id
      AND can_access_center(auth.uid(), h.center_id)
    )
    OR EXISTS (
      SELECT 1 FROM student_parents sp
      JOIN parents p ON p.id = sp.parent_id
      WHERE sp.student_id = report_entries.student_id
      AND p.user_id = auth.uid()
    )
  );

-- Fix student_badges - filter by center through student
DROP POLICY IF EXISTS "Student badges viewable" ON public.student_badges;
CREATE POLICY "Student badges viewable by center members" ON public.student_badges
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_badges.student_id
      AND can_access_center(auth.uid(), s.center_id)
    )
  );

-- Fix student_parents - filter by center through student
DROP POLICY IF EXISTS "Student parents viewable" ON public.student_parents;
CREATE POLICY "Student parents viewable by center members" ON public.student_parents
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_parents.student_id
      AND can_access_center(auth.uid(), s.center_id)
    )
    OR EXISTS (
      SELECT 1 FROM parents p
      WHERE p.id = student_parents.parent_id
      AND p.user_id = auth.uid()
    )
  );

-- Fix student_points - filter by center and hide from parents
DROP POLICY IF EXISTS "Student points viewable by all" ON public.student_points;
CREATE POLICY "Student points viewable by center members except parents" ON public.student_points
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (
      NOT has_role(auth.uid(), 'parent')
      AND EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = student_points.student_id
        AND can_access_center(auth.uid(), s.center_id)
      )
    )
    OR EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_points.student_id
      AND s.user_id = auth.uid()
    )
  );

-- Fix store_items - filter by center
DROP POLICY IF EXISTS "Store items viewable by non-parents" ON public.store_items;
CREATE POLICY "Store items viewable by center members except parents" ON public.store_items
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (
      NOT has_role(auth.uid(), 'parent')
      AND (center_id IS NULL OR can_access_center(auth.uid(), center_id))
    )
  );

-- Fix parents viewable - center admins should see parents in their center
DROP POLICY IF EXISTS "Parents viewable by authenticated users" ON public.parents;
CREATE POLICY "Parents viewable by center members" ON public.parents
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM student_parents sp
      JOIN students s ON s.id = sp.student_id
      WHERE sp.parent_id = parents.id
      AND can_access_center(auth.uid(), s.center_id)
    )
  );

-- Add center_admin management policies for key tables

-- Center admins can manage activities in their center
DROP POLICY IF EXISTS "Center admin can manage activities" ON public.activities;
CREATE POLICY "Center admin can manage activities" ON public.activities
  FOR ALL TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (
      has_role(auth.uid(), 'center_admin')
      AND can_access_center(auth.uid(), center_id)
    )
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (
      has_role(auth.uid(), 'center_admin')
      AND can_access_center(auth.uid(), center_id)
    )
  );

-- Center admins can manage courses in their center
DROP POLICY IF EXISTS "Center admin can manage courses" ON public.courses;
CREATE POLICY "Center admin can manage courses" ON public.courses
  FOR ALL TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (
      has_role(auth.uid(), 'center_admin')
      AND can_access_center(auth.uid(), center_id)
    )
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (
      has_role(auth.uid(), 'center_admin')
      AND can_access_center(auth.uid(), center_id)
    )
  );

-- Center admins can manage fees in their center
DROP POLICY IF EXISTS "Center admin can manage fees" ON public.fees;
CREATE POLICY "Center admin can manage fees" ON public.fees
  FOR ALL TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (
      has_role(auth.uid(), 'center_admin')
      AND can_access_center(auth.uid(), center_id)
    )
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (
      has_role(auth.uid(), 'center_admin')
      AND can_access_center(auth.uid(), center_id)
    )
  );

-- Center admins can manage halaqat in their center
DROP POLICY IF EXISTS "Center admin can manage halaqat" ON public.halaqat;
CREATE POLICY "Center admin can manage halaqat" ON public.halaqat
  FOR ALL TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (
      has_role(auth.uid(), 'center_admin')
      AND can_access_center(auth.uid(), center_id)
    )
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (
      has_role(auth.uid(), 'center_admin')
      AND can_access_center(auth.uid(), center_id)
    )
  );

-- Center admins can manage students in their center
DROP POLICY IF EXISTS "Center admin can manage students" ON public.students;
CREATE POLICY "Center admin can manage students" ON public.students
  FOR ALL TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (
      has_role(auth.uid(), 'center_admin')
      AND can_access_center(auth.uid(), center_id)
    )
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (
      has_role(auth.uid(), 'center_admin')
      AND can_access_center(auth.uid(), center_id)
    )
  );

-- Center admins can manage announcements in their center
DROP POLICY IF EXISTS "Center admin can manage announcements" ON public.announcements;
CREATE POLICY "Center admin can manage announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (
      (has_role(auth.uid(), 'center_admin') OR has_role(auth.uid(), 'communication_officer'))
      AND can_access_center(auth.uid(), center_id)
    )
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (
      (has_role(auth.uid(), 'center_admin') OR has_role(auth.uid(), 'communication_officer'))
      AND can_access_center(auth.uid(), center_id)
    )
  );
