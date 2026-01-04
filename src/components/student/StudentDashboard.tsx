import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  Award,
  Loader2,
  CalendarDays,
  MapPin,
  Trophy,
  ShoppingCart,
  Home
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ProgressChart } from "./ProgressChart";
import { StudentPoints } from "./StudentPoints";
import { StudentLeaderboard } from "./StudentLeaderboard";
import { StudentStore } from "./StudentStore";
import { StudentBadges } from "./StudentBadges";

type TabType = "home" | "store" | "badges" | "leaderboard" | "reports";

interface StudentInfo {
  id: string;
  full_name: string;
  halqa_id: string | null;
  halqa_name?: string;
  join_date: string | null;
  previous_memorization_surah: string | null;
  previous_memorization_ayah: number | null;
}

interface ReportEntry {
  id: string;
  report_id: string;
  attendance_status: string | null;
  notes: string | null;
  report_date: string;
  recitations: Recitation[];
}

interface Recitation {
  id: string;
  surah: string;
  from_ayah: number;
  to_ayah: number;
  type: string;
  grade: number | null;
  notes: string | null;
}

interface AttendanceStats {
  present: number;
  absent: number;
  absent_with_permission: number;
  escaped: number;
  total: number;
}

interface Activity {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  requires_approval: boolean;
}

interface ActivityApproval {
  id: string;
  activity_id: string;
  approved: boolean | null;
  activity?: Activity;
}

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [isLoading, setIsLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [reportEntries, setReportEntries] = useState<ReportEntry[]>([]);
  const [activities, setActivities] = useState<ActivityApproval[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    present: 0,
    absent: 0,
    absent_with_permission: 0,
    escaped: 0,
    total: 0
  });

  useEffect(() => {
    if (user?.id) {
      fetchStudentData();
    }
  }, [user?.id]);

  const fetchStudentData = async () => {
    try {
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select(`id, full_name, halqa_id, join_date, previous_memorization_surah, previous_memorization_ayah, halaqat (name)`)
        .eq("user_id", user?.id)
        .maybeSingle();

      if (studentError) throw studentError;

      if (student) {
        setStudentInfo({ ...student, halqa_name: student.halaqat?.name });

        const { data: entries } = await supabase
          .from("report_entries")
          .select(`id, report_id, attendance_status, notes, reports (report_date), recitations (id, surah, from_ayah, to_ayah, type, grade, notes)`)
          .eq("student_id", student.id)
          .order("created_at", { ascending: false })
          .limit(30);

        const formattedEntries = (entries || []).map(entry => ({
          id: entry.id,
          report_id: entry.report_id,
          attendance_status: entry.attendance_status,
          notes: entry.notes,
          report_date: entry.reports?.report_date || "",
          recitations: entry.recitations || []
        }));

        setReportEntries(formattedEntries);

        const stats: AttendanceStats = { present: 0, absent: 0, absent_with_permission: 0, escaped: 0, total: formattedEntries.length };
        formattedEntries.forEach(entry => {
          if (entry.attendance_status === "present") stats.present++;
          else if (entry.attendance_status === "absent") stats.absent++;
          else if (entry.attendance_status === "absent_with_permission") stats.absent_with_permission++;
          else if (entry.attendance_status === "escaped") stats.escaped++;
        });
        setAttendanceStats(stats);

        const { data: activitiesData } = await supabase
          .from("activity_approvals")
          .select(`id, activity_id, approved, activities (*)`)
          .eq("student_id", student.id);

        setActivities(activitiesData?.map((a: any) => ({ ...a, activity: a.activities })) || []);
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRecitationTypeLabel = (type: string) => {
    switch (type) {
      case "new_memorization": return "حفظ جديد";
      case "review": return "مراجعة";
      case "recitation": return "تسميع";
      case "talqeen": return "تلقين";
      default: return type;
    }
  };

  const attendanceRate = attendanceStats.total > 0 ? Math.round((attendanceStats.present / attendanceStats.total) * 100) : 0;
  const totalRecitations = reportEntries.reduce((sum, entry) => sum + entry.recitations.length, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!studentInfo) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">لم يتم العثور على بيانات الطالب</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Student Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{studentInfo.full_name}</h2>
              {studentInfo.halqa_name && <Badge variant="secondary" className="mt-1">{studentInfo.halqa_name}</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{attendanceRate}%</p>
                <p className="text-xs text-muted-foreground">نسبة الحضور</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalRecitations}</p>
                <p className="text-xs text-muted-foreground">إجمالي التسميعات</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Content */}
      {activeTab === "home" && <StudentPoints studentId={studentInfo.id} />}
      {activeTab === "store" && <StudentStore studentId={studentInfo.id} halqaId={studentInfo.halqa_id} />}
      {activeTab === "badges" && <StudentBadges studentId={studentInfo.id} />}
      {activeTab === "leaderboard" && <StudentLeaderboard halqaId={studentInfo.halqa_id || undefined} currentStudentId={studentInfo.id} limit={20} />}
      {activeTab === "reports" && (
        <div className="space-y-3">
          {reportEntries.length === 0 ? (
            <Card className="p-6 text-center">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">لا توجد تقارير حتى الآن</p>
            </Card>
          ) : (
            reportEntries.map(entry => (
              <Card key={entry.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-foreground">
                      {entry.report_date ? format(new Date(entry.report_date), "d MMMM yyyy", { locale: ar }) : "غير محدد"}
                    </span>
                  </div>
                  {entry.recitations.length > 0 && (
                    <div className="space-y-2">
                      {entry.recitations.map(rec => (
                        <div key={rec.id} className="bg-muted/50 rounded-lg p-3">
                          <Badge variant="outline" className="mb-1">{getRecitationTypeLabel(rec.type)}</Badge>
                          <p className="text-sm text-foreground">سورة {rec.surah} (الآيات {rec.from_ayah} - {rec.to_ayah})</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 px-2 py-2">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button onClick={() => setActiveTab("home")} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === "home" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}>
            <Home className="w-5 h-5" />
            <span className="text-xs">الرئيسية</span>
          </button>
          <button onClick={() => setActiveTab("store")} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === "store" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}>
            <ShoppingCart className="w-5 h-5" />
            <span className="text-xs">المتجر</span>
          </button>
          <button onClick={() => setActiveTab("badges")} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === "badges" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}>
            <Award className="w-5 h-5" />
            <span className="text-xs">الشارات</span>
          </button>
          <button onClick={() => setActiveTab("leaderboard")} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === "leaderboard" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}>
            <Trophy className="w-5 h-5" />
            <span className="text-xs">المتصدرين</span>
          </button>
          <button onClick={() => setActiveTab("reports")} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === "reports" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}>
            <FileText className="w-5 h-5" />
            <span className="text-xs">التقارير</span>
          </button>
        </div>
      </div>
    </div>
  );
};