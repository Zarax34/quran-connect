import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  Award,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

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

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [reportEntries, setReportEntries] = useState<ReportEntry[]>([]);
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
      // Get student info by user_id
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select(`
          id,
          full_name,
          halqa_id,
          join_date,
          previous_memorization_surah,
          previous_memorization_ayah,
          halaqat (name)
        `)
        .eq("user_id", user?.id)
        .maybeSingle();

      if (studentError) throw studentError;

      if (student) {
        setStudentInfo({
          ...student,
          halqa_name: student.halaqat?.name
        });

        // Get report entries for this student
        const { data: entries, error: entriesError } = await supabase
          .from("report_entries")
          .select(`
            id,
            report_id,
            attendance_status,
            notes,
            reports (report_date),
            recitations (
              id,
              surah,
              from_ayah,
              to_ayah,
              type,
              grade,
              notes
            )
          `)
          .eq("student_id", student.id)
          .order("created_at", { ascending: false })
          .limit(30);

        if (entriesError) throw entriesError;

        const formattedEntries = (entries || []).map(entry => ({
          id: entry.id,
          report_id: entry.report_id,
          attendance_status: entry.attendance_status,
          notes: entry.notes,
          report_date: entry.reports?.report_date || "",
          recitations: entry.recitations || []
        }));

        setReportEntries(formattedEntries);

        // Calculate attendance stats
        const stats: AttendanceStats = {
          present: 0,
          absent: 0,
          absent_with_permission: 0,
          escaped: 0,
          total: formattedEntries.length
        };

        formattedEntries.forEach(entry => {
          if (entry.attendance_status === "present") stats.present++;
          else if (entry.attendance_status === "absent") stats.absent++;
          else if (entry.attendance_status === "absent_with_permission") stats.absent_with_permission++;
          else if (entry.attendance_status === "escaped") stats.escaped++;
        });

        setAttendanceStats(stats);
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAttendanceIcon = (status: string | null) => {
    switch (status) {
      case "present":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "absent":
        return <XCircle className="w-4 h-4 text-destructive" />;
      case "absent_with_permission":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "escaped":
        return <XCircle className="w-4 h-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const getAttendanceLabel = (status: string | null) => {
    switch (status) {
      case "present": return "حاضر";
      case "absent": return "غائب";
      case "absent_with_permission": return "غياب بإذن";
      case "escaped": return "هروب";
      default: return "غير محدد";
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

  const attendanceRate = attendanceStats.total > 0 
    ? Math.round((attendanceStats.present / attendanceStats.total) * 100) 
    : 0;

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
    <div className="space-y-6">
      {/* Student Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{studentInfo.full_name}</h2>
              {studentInfo.halqa_name && (
                <Badge variant="secondary" className="mt-1">
                  {studentInfo.halqa_name}
                </Badge>
              )}
              {studentInfo.join_date && (
                <p className="text-sm text-muted-foreground mt-1">
                  تاريخ الالتحاق: {format(new Date(studentInfo.join_date), "d MMMM yyyy", { locale: ar })}
                </p>
              )}
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

      {/* Previous Memorization */}
      {studentInfo.previous_memorization_surah && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              الحفظ السابق
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">
              سورة {studentInfo.previous_memorization_surah}
              {studentInfo.previous_memorization_ayah && (
                <span className="text-muted-foreground"> - الآية {studentInfo.previous_memorization_ayah}</span>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Reports and Attendance */}
      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reports">التقارير</TabsTrigger>
          <TabsTrigger value="attendance">الحضور</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4 space-y-3">
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
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {entry.report_date ? format(new Date(entry.report_date), "d MMMM yyyy", { locale: ar }) : "غير محدد"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getAttendanceIcon(entry.attendance_status)}
                      <span className="text-sm text-muted-foreground">
                        {getAttendanceLabel(entry.attendance_status)}
                      </span>
                    </div>
                  </div>

                  {entry.recitations.length > 0 && (
                    <div className="space-y-2">
                      {entry.recitations.map(rec => (
                        <div key={rec.id} className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <Badge variant="outline" className="mb-1">
                                {getRecitationTypeLabel(rec.type)}
                              </Badge>
                              <p className="text-sm text-foreground">
                                سورة {rec.surah} (الآيات {rec.from_ayah} - {rec.to_ayah})
                              </p>
                            </div>
                            {rec.grade !== null && (
                              <div className="text-center">
                                <p className="text-lg font-bold text-primary">{rec.grade}</p>
                                <p className="text-xs text-muted-foreground">الدرجة</p>
                              </div>
                            )}
                          </div>
                          {rec.notes && (
                            <p className="text-xs text-muted-foreground mt-2">{rec.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {entry.notes && (
                    <p className="text-sm text-muted-foreground mt-3 border-t pt-2">
                      {entry.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-foreground">حاضر</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">{attendanceStats.present}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-destructive" />
                    <span className="text-foreground">غائب</span>
                  </div>
                  <span className="text-xl font-bold text-destructive">{attendanceStats.absent}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span className="text-foreground">غياب بإذن</span>
                  </div>
                  <span className="text-xl font-bold text-yellow-600">{attendanceStats.absent_with_permission}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-orange-500" />
                    <span className="text-foreground">هروب</span>
                  </div>
                  <span className="text-xl font-bold text-orange-500">{attendanceStats.escaped}</span>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">إجمالي الأيام</span>
                    <span className="text-xl font-bold text-foreground">{attendanceStats.total}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
