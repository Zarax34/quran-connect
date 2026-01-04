-- =====================================================
-- نظام الشارات والمتجر الشامل - الجزء 1
-- =====================================================

-- 1. جدول إعدادات الشارات
CREATE TABLE public.badge_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    icon_name text DEFAULT 'award',
    points_value integer NOT NULL DEFAULT 0,
    requirements_type text NOT NULL,
    requirements_value jsonb NOT NULL DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. جدول هدايا المتجر (يجب أن يكون قبل student_purchases)
CREATE TABLE public.store_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    image_url text,
    points_cost integer DEFAULT 0,
    badges_cost integer DEFAULT 0,
    item_type text NOT NULL DEFAULT 'student',
    is_active boolean DEFAULT true,
    stock_quantity integer,
    center_id uuid REFERENCES public.centers(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. جدول شارات الطلاب المكتسبة
CREATE TABLE public.student_badges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    badge_setting_id uuid NOT NULL REFERENCES public.badge_settings(id) ON DELETE CASCADE,
    earned_at timestamp with time zone DEFAULT now(),
    earned_date date DEFAULT CURRENT_DATE,
    notes text,
    UNIQUE(student_id, badge_setting_id, earned_date)
);

-- 4. جدول شارات الحلقة
CREATE TABLE public.halqa_badges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    halqa_id uuid NOT NULL REFERENCES public.halaqat(id) ON DELETE CASCADE,
    badge_name text NOT NULL,
    description text,
    earned_at timestamp with time zone DEFAULT now(),
    points_value integer DEFAULT 0
);

-- 5. جدول نقاط الحلقة
CREATE TABLE public.halqa_points (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    halqa_id uuid NOT NULL REFERENCES public.halaqat(id) ON DELETE CASCADE,
    points integer NOT NULL DEFAULT 0,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 6. جدول مشتريات الطلاب
CREATE TABLE public.student_purchases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    store_item_id uuid NOT NULL REFERENCES public.store_items(id) ON DELETE CASCADE,
    points_spent integer DEFAULT 0,
    badges_spent integer DEFAULT 0,
    status text DEFAULT 'pending',
    purchased_at timestamp with time zone DEFAULT now(),
    delivered_at timestamp with time zone
);

-- 7. جدول التصويت على هدايا الحلقة
CREATE TABLE public.halqa_purchase_votes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    halqa_id uuid NOT NULL REFERENCES public.halaqat(id) ON DELETE CASCADE,
    store_item_id uuid NOT NULL REFERENCES public.store_items(id) ON DELETE CASCADE,
    initiated_by uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    votes_for integer DEFAULT 1,
    votes_against integer DEFAULT 0,
    total_students integer NOT NULL,
    required_votes integer NOT NULL,
    status text DEFAULT 'voting',
    created_at timestamp with time zone DEFAULT now(),
    ends_at timestamp with time zone
);

-- 8. جدول أصوات الطلاب
CREATE TABLE public.student_votes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vote_id uuid NOT NULL REFERENCES public.halqa_purchase_votes(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    vote boolean NOT NULL,
    voted_at timestamp with time zone DEFAULT now(),
    UNIQUE(vote_id, student_id)
);

-- 9. جدول تحويلات النقاط
CREATE TABLE public.points_conversions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    conversion_type text NOT NULL,
    amount integer NOT NULL,
    result integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.badge_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halqa_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halqa_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halqa_purchase_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_conversions ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "Badge settings viewable by all" ON public.badge_settings FOR SELECT USING (true);
CREATE POLICY "Admin can manage badge settings" ON public.badge_settings FOR ALL USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'center_admin'::app_role));

CREATE POLICY "Store items viewable by non-parents" ON public.store_items FOR SELECT USING (NOT has_role(auth.uid(), 'parent'::app_role));
CREATE POLICY "Admin can manage store items" ON public.store_items FOR ALL USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'center_admin'::app_role));

CREATE POLICY "Student badges viewable" ON public.student_badges FOR SELECT USING (true);
CREATE POLICY "Admin can manage student badges" ON public.student_badges FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Halqa badges viewable" ON public.halqa_badges FOR SELECT USING (true);
CREATE POLICY "Admin can manage halqa badges" ON public.halqa_badges FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Halqa points viewable" ON public.halqa_points FOR SELECT USING (true);
CREATE POLICY "Admin can manage halqa points" ON public.halqa_points FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Own purchases viewable" ON public.student_purchases FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()) OR is_super_admin(auth.uid()) OR has_role(auth.uid(), 'center_admin'::app_role));
CREATE POLICY "Students can purchase" ON public.student_purchases FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Admin can manage purchases" ON public.student_purchases FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Votes viewable" ON public.halqa_purchase_votes FOR SELECT USING (true);
CREATE POLICY "Students can initiate votes" ON public.halqa_purchase_votes FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = initiated_by AND s.user_id = auth.uid()));
CREATE POLICY "Admin can manage votes" ON public.halqa_purchase_votes FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Own student votes viewable" ON public.student_votes FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Students can vote" ON public.student_votes FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Admin can manage student votes" ON public.student_votes FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Own conversions viewable" ON public.points_conversions FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Students can convert" ON public.points_conversions FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Admin can manage conversions" ON public.points_conversions FOR ALL USING (is_super_admin(auth.uid()));

-- تحديث دوال النقاط
CREATE OR REPLACE FUNCTION public.get_attendance_points(_status text)
RETURNS integer LANGUAGE plpgsql STABLE SET search_path = public AS $$
BEGIN
    CASE _status
        WHEN 'present' THEN RETURN 1;
        WHEN 'absent_with_permission' THEN RETURN 0;
        WHEN 'absent' THEN RETURN -1;
        WHEN 'escaped' THEN RETURN -2;
        ELSE RETURN 0;
    END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_recitation_points(_recitation_type text, _from_ayah integer, _to_ayah integer, _grade integer)
RETURNS integer LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
    base_points integer := 0;
    ayah_count integer;
    page_estimate numeric;
BEGIN
    ayah_count := _to_ayah - _from_ayah + 1;
    page_estimate := GREATEST(ayah_count / 15.0, 0.5);
    
    CASE _recitation_type
        WHEN 'new_memorization' THEN
            IF _grade >= 9 THEN base_points := 3;
            ELSIF _grade >= 8 THEN base_points := 2;
            ELSIF _grade >= 7 THEN base_points := 1;
            ELSIF _grade >= 5 THEN base_points := 0;
            ELSE base_points := 0;
            END IF;
        WHEN 'review' THEN
            IF _grade >= 5 THEN base_points := 1;
            ELSE base_points := 0;
            END IF;
        ELSE base_points := 0;
    END CASE;
    
    RETURN ROUND(base_points * page_estimate);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_halqa_total_points(_halqa_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(SUM(points), 0)::integer FROM public.halqa_points WHERE halqa_id = _halqa_id
$$;

CREATE OR REPLACE FUNCTION public.get_student_available_points(_student_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT 
        COALESCE((SELECT SUM(points) FROM public.student_points WHERE student_id = _student_id), 0)::integer
        - COALESCE((SELECT SUM(points_spent) FROM public.student_purchases WHERE student_id = _student_id AND status != 'cancelled'), 0)::integer
        - COALESCE((SELECT SUM(amount) * 10 FROM public.points_conversions WHERE student_id = _student_id AND conversion_type = 'points_to_badges'), 0)::integer
$$;

CREATE OR REPLACE FUNCTION public.get_student_available_badges(_student_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT 
        COALESCE((SELECT COUNT(*) FROM public.student_badges WHERE student_id = _student_id), 0)::integer
        + COALESCE((SELECT SUM(result) FROM public.points_conversions WHERE student_id = _student_id AND conversion_type = 'points_to_badges'), 0)::integer
        - COALESCE((SELECT SUM(badges_spent) FROM public.student_purchases WHERE student_id = _student_id AND status != 'cancelled'), 0)::integer
        - COALESCE((SELECT SUM(amount) FROM public.points_conversions WHERE student_id = _student_id AND conversion_type = 'badges_to_points'), 0)::integer
$$;

-- إدخال الشارات الافتراضية
INSERT INTO public.badge_settings (name, description, requirements_type, requirements_value, points_value) VALUES
('المتقن', 'تكتسب عند الحصول على تقدير ممتاز لعشرة أيام', 'excellent_days', '{"days": 10}', 5),
('الحاضر المثالي', 'تكتسب عند حضور الشهر كاملاً', 'attendance_month', '{"days": 30}', 10),
('خريج الدورة', 'تكتسب عند إنهاء دورة تدريبية', 'course_completion', '{}', 5),
('الطالب المتفوق', 'تكتسب عند الحصول على درجة أعلى من 90%', 'exam_score', '{"min_score": 90}', 4),
('الحافظ', 'تكتسب عند حفظ 500 وجه خلال عام', 'memorization_pages', '{"pages": 500}', 1000),
('المشارك', 'تكتسب عند المشاركة في 3 أنشطة حضورية متتالية', 'activities', '{"count": 3}', 3),
('الملتزم', 'تكتسب عند التزام الطالب بخطته الشهرية', 'monthly_plan', '{}', 10),
('المجتهد', 'تكتسب عند إنهاء الخطة الشهرية مع زيادة', 'extra_effort', '{}', 15);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.halqa_purchase_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_votes;