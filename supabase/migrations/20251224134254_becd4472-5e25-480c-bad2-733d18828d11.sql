-- إنشاء أنواع البيانات (Enums)
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'center_admin',
  'teacher',
  'communication_officer',
  'parent',
  'student'
);

CREATE TYPE public.attendance_status AS ENUM (
  'present',
  'absent',
  'absent_with_permission',
  'escaped'
);

CREATE TYPE public.recitation_type AS ENUM (
  'new_memorization',
  'review',
  'recitation',
  'talqeen'
);

-- 1. جدول المراكز
CREATE TABLE public.centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول الملفات الشخصية
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول الأدوار (منفصل للأمان)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role, center_id)
);

-- 4. جدول الحلقات
CREATE TABLE public.halaqat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id),
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE NOT NULL,
  category TEXT,
  max_students INTEGER DEFAULT 20,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. جدول الطلاب
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  birth_date DATE,
  phone TEXT,
  photo_url TEXT,
  province TEXT,
  current_residence TEXT,
  previous_residence TEXT,
  join_date DATE DEFAULT CURRENT_DATE,
  previous_memorization_surah TEXT,
  previous_memorization_ayah INTEGER,
  halqa_id UUID REFERENCES public.halaqat(id) ON DELETE SET NULL,
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. جدول أولياء الأمور
CREATE TABLE public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  work TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ربط الطلاب بأولياء الأمور
CREATE TABLE public.student_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE NOT NULL,
  relationship TEXT DEFAULT 'parent',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, parent_id)
);

-- 8. جدول التقارير
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  halqa_id UUID REFERENCES public.halaqat(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id),
  report_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewer_id UUID REFERENCES public.profiles(id),
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. تفاصيل التقارير
CREATE TABLE public.report_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  attendance_status public.attendance_status DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. تسميعات الطالب
CREATE TABLE public.recitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_entry_id UUID REFERENCES public.report_entries(id) ON DELETE CASCADE NOT NULL,
  type public.recitation_type NOT NULL,
  surah TEXT NOT NULL,
  from_ayah INTEGER NOT NULL,
  to_ayah INTEGER NOT NULL,
  grade INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. جدول الدورات
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE NOT NULL,
  supervisor_id UUID REFERENCES public.profiles(id),
  max_participants INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. تسجيلات الدورات
CREATE TABLE public.course_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  registration_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'registered',
  certificate_issued BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

-- 13. جدول الأنشطة
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE NOT NULL,
  requires_approval BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. موافقات الأنشطة
CREATE TABLE public.activity_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE NOT NULL,
  approved BOOLEAN,
  response_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, student_id)
);

-- 15. جدول الرسوم
CREATE TABLE public.fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE NOT NULL,
  halqa_id UUID REFERENCES public.halaqat(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. سداد الرسوم
CREATE TABLE public.fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_id UUID REFERENCES public.fees(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. جدول العطل
CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. جدول الإعلانات
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
  halqa_id UUID REFERENCES public.halaqat(id) ON DELETE SET NULL,
  target_roles public.app_role[],
  is_active BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. جدول الرسائل
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. جدول الإشعارات
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT,
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. إعدادات النظام
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- تفعيل RLS على جميع الجداول
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halaqat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- دالة التحقق من الدور
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- دالة التحقق من super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'super_admin')
$$;

-- دالة التحقق من صلاحية الوصول للمركز
CREATE OR REPLACE FUNCTION public.can_access_center(_user_id uuid, _center_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND (center_id = _center_id OR center_id IS NULL)
  )
$$;

-- دالة الحصول على مراكز المستخدم
CREATE OR REPLACE FUNCTION public.get_user_center_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT center_id FROM public.user_roles
  WHERE user_id = _user_id AND center_id IS NOT NULL
$$;

-- دالة إنشاء الملف الشخصي
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email));
  RETURN NEW;
END;
$$;

-- Trigger لإنشاء الملف الشخصي تلقائياً
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- سياسات الأمان للمراكز
CREATE POLICY "Centers are viewable by authenticated users"
  ON public.centers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin can manage centers"
  ON public.centers FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- سياسات الملفات الشخصية
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Super admin can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- سياسات الأدوار
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admin can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- سياسات الحلقات
CREATE POLICY "Halaqat viewable by center members"
  ON public.halaqat FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR 
    public.can_access_center(auth.uid(), center_id)
  );

CREATE POLICY "Super admin can manage halaqat"
  ON public.halaqat FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- سياسات الطلاب
CREATE POLICY "Students viewable by center members"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR 
    public.can_access_center(auth.uid(), center_id)
  );

CREATE POLICY "Super admin can manage students"
  ON public.students FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- سياسات أولياء الأمور
CREATE POLICY "Parents viewable by authenticated users"
  ON public.parents FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    user_id = auth.uid()
  );

CREATE POLICY "Super admin can manage parents"
  ON public.parents FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- سياسات ربط الطلاب بأولياء الأمور
CREATE POLICY "Student parents viewable"
  ON public.student_parents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin can manage student parents"
  ON public.student_parents FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- سياسات التقارير
CREATE POLICY "Reports viewable by center members"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.halaqat h 
      WHERE h.id = halqa_id 
      AND public.can_access_center(auth.uid(), h.center_id)
    )
  );

CREATE POLICY "Teachers can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'teacher') OR
    public.has_role(auth.uid(), 'center_admin') OR
    public.has_role(auth.uid(), 'communication_officer')
  );

CREATE POLICY "Super admin can manage reports"
  ON public.reports FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- سياسات تفاصيل التقارير
CREATE POLICY "Report entries viewable"
  ON public.report_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin can manage report entries"
  ON public.report_entries FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- سياسات التسميعات
CREATE POLICY "Recitations viewable"
  ON public.recitations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin can manage recitations"
  ON public.recitations FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- سياسات الدورات
CREATE POLICY "Courses viewable by center members"
  ON public.courses FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR 
    public.can_access_center(auth.uid(), center_id)
  );

CREATE POLICY "Super admin can manage courses"
  ON public.courses FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- سياسات تسجيلات الدورات
CREATE POLICY "Course registrations viewable"
  ON public.course_registrations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin can manage course registrations"
  ON public.course_registrations FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- سياسات الأنشطة
CREATE POLICY "Activities viewable by center members"
  ON public.activities FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR 
    public.can_access_center(auth.uid(), center_id)
  );

CREATE POLICY "Super admin can manage activities"
  ON public.activities FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- سياسات موافقات الأنشطة
CREATE POLICY "Activity approvals viewable"
  ON public.activity_approvals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin can manage activity approvals"
  ON public.activity_approvals FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- سياسات الرسوم
CREATE POLICY "Fees viewable by center members"
  ON public.fees FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR 
    public.can_access_center(auth.uid(), center_id)
  );

CREATE POLICY "Super admin can manage fees"
  ON public.fees FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- سياسات سداد الرسوم
CREATE POLICY "Fee payments viewable"
  ON public.fee_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin can manage fee payments"
  ON public.fee_payments FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- سياسات العطل
CREATE POLICY "Holidays viewable by all"
  ON public.holidays FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin can manage holidays"
  ON public.holidays FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- سياسات الإعلانات
CREATE POLICY "Announcements viewable by all"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin can manage announcements"
  ON public.announcements FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- سياسات الرسائل
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- سياسات الإشعارات
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admin can manage notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- سياسات إعدادات النظام
CREATE POLICY "Settings viewable by super admin"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can manage settings"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));