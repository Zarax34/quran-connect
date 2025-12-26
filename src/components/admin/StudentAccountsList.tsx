import { useState, useEffect } from "react";
import { Users, Search, Loader2, Key, User, Copy, Check, Power } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface StudentAccount {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  halqa_name: string | null;
  center_name: string | null;
  has_account: boolean;
  parent_phone: string | null;
  is_active: boolean;
}

export const StudentAccountsList = () => {
  const { isSuperAdmin, selectedCenterId } = useAuth();
  const [students, setStudents] = useState<StudentAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentAccounts();
  }, [isSuperAdmin, selectedCenterId]);

  const fetchStudentAccounts = async () => {
    try {
      // Fetch students with their halqa and center info
      let query = supabase
        .from("students")
        .select(`
          id,
          full_name,
          phone,
          user_id,
          is_active,
          halqa_id,
          center_id,
          halaqat:halqa_id (name),
          centers:center_id (name)
        `)
        .not("user_id", "is", null);

      if (!isSuperAdmin && selectedCenterId) {
        query = query.eq("center_id", selectedCenterId);
      }

      const { data: studentsData, error: studentsError } = await query;

      if (studentsError) throw studentsError;

      // Get parent phones for students
      const studentIds = studentsData?.map(s => s.id) || [];
      
      const { data: studentParentsData } = await supabase
        .from("student_parents")
        .select(`
          student_id,
          parents:parent_id (phone)
        `)
        .in("student_id", studentIds);

      // Map students with account info
      const studentAccounts: StudentAccount[] = (studentsData || []).map(student => {
        const parentInfo = studentParentsData?.find(sp => sp.student_id === student.id);
        return {
          id: student.id,
          user_id: student.user_id!,
          full_name: student.full_name,
          phone: student.phone,
          halqa_name: (student.halaqat as any)?.name || null,
          center_name: (student.centers as any)?.name || null,
          has_account: !!student.user_id,
          parent_phone: (parentInfo?.parents as any)?.phone || null,
          is_active: student.is_active ?? true,
        };
      });

      setStudents(studentAccounts);
    } catch (error) {
      console.error("Error fetching student accounts:", error);
      toast.error("حدث خطأ في تحميل حسابات الطلاب");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAccountStatus = async (student: StudentAccount) => {
    setTogglingId(student.id);
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const action = student.is_active ? "disable" : "enable";
      
      const response = await fetch(`${supabaseUrl}/functions/v1/toggle-user-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: student.user_id,
          action,
        }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      // Update local state
      setStudents(prev => prev.map(s => 
        s.id === student.id ? { ...s, is_active: !s.is_active } : s
      ));

      toast.success(student.is_active ? "تم تعطيل الحساب" : "تم تفعيل الحساب");
    } catch (error: any) {
      console.error("Error toggling account:", error);
      toast.error(error.message || "حدث خطأ في تغيير حالة الحساب");
    } finally {
      setTogglingId(null);
    }
  };

  const getPassword = (student: StudentAccount): string => {
    return student.phone || student.parent_phone || "غير متوفر";
  };

  const copyToClipboard = async (text: string, studentId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(studentId);
      toast.success("تم النسخ");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("فشل النسخ");
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.full_name.includes(searchQuery) ||
      s.halqa_name?.includes(searchQuery) ||
      s.center_name?.includes(searchQuery)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-bold text-foreground">حسابات الطلاب</h2>
        <Badge variant="secondary" className="text-sm">
          {students.length} حساب
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="ابحث عن طالب..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Key className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">معلومات تسجيل الدخول</p>
            <p>اسم المستخدم: اسم الطالب الكامل</p>
            <p>كلمة المرور: رقم هاتف الطالب أو ولي أمره</p>
          </div>
        </div>
      </Card>

      {filteredStudents.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">
            {students.length === 0 ? "لا توجد حسابات طلاب" : "لم يتم العثور على نتائج"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((student) => (
            <Card key={student.id} className={`p-4 ${!student.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{student.full_name}</h3>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={student.is_active ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}
                      >
                        {student.is_active ? "مفعّل" : "معطّل"}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {togglingId === student.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Switch
                            checked={student.is_active}
                            onCheckedChange={() => toggleAccountStatus(student)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {student.halqa_name && (
                    <p className="text-sm text-muted-foreground">
                      الحلقة: {student.halqa_name}
                    </p>
                  )}
                  
                  {student.center_name && (
                    <p className="text-sm text-muted-foreground">
                      المركز: {student.center_name}
                    </p>
                  )}

                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">اسم المستخدم:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-foreground">
                          {student.full_name}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(student.full_name, `${student.id}-name`)}
                        >
                          {copiedId === `${student.id}-name` ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">كلمة المرور:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-foreground" dir="ltr">
                          {getPassword(student)}
                        </code>
                        {getPassword(student) !== "غير متوفر" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => copyToClipboard(getPassword(student), `${student.id}-pass`)}
                          >
                            {copiedId === `${student.id}-pass` ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
