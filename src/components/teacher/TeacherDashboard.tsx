import { useState, useEffect } from "react";
import { 
  FileText, 
  Bell, 
  Settings,
  Users,
  LogOut,
  Loader2,
  LayoutDashboard,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  CalendarDays,
  Trophy
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DailyReports } from "./DailyReports";
import { UserSettings } from "@/components/settings/UserSettings";
import { HolidaysManagement } from "@/components/admin/HolidaysManagement";
import { StudentLeaderboard } from "@/components/student/StudentLeaderboard";

type TabType = "home" | "reports" | "review" | "holidays" | "leaderboard" | "notifications" | "settings";

interface Stats {
  myStudents: number;
  myReports: number;
  pendingReports: number;
}

interface Report {
  id: string;
  halqa_id: string;
  report_date: string;
  status: string;
  teacher_id?: string;
  halqa?: { name: string; center_id: string };
  teacher?: { full_name: string };
}

interface ReportEntry {
  id: string;
  student_id: string;
  attendance_status: string;
  notes: string | null;
  student?: { full_name: string };
  recitations?: {
    surah: string;
    from_ayah: number;
    to_ayah: number;
    type: string;
    grade: number | null;
  }[];
}

export const TeacherDashboard = () => {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const { user, profile, signOut, roles, selectedCenterId } = useAuth();
  const [stats, setStats] = useState<Stats>({
    myStudents: 0,
    myReports: 0,
    pendingReports: 0,
  });
  const [pendingReports, setPendingReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState<string | null>(null);
  
  // Rejection dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingReport, setRejectingReport] = useState<Report | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  
  // View details dialog state
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportEntries, setReportEntries] = useState<ReportEntry[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const isCommunicationOfficer = roles.some(r => r.role === "communication_officer");

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id, selectedCenterId]);

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    
    try {
      // Get teacher's halaqat
      const { data: halaqat } = await supabase
        .from("halaqat")
        .select("id")
        .eq("teacher_id", user.id);
      
      const halqaIds = halaqat?.map(h => h.id) || [];
      
      // Count students in teacher's halaqat
      let studentsCount = 0;
      if (halqaIds.length > 0) {
        const { count } = await supabase
          .from("students")
          .select("*", { count: "exact", head: true })
          .in("halqa_id", halqaIds)
          .eq("is_active", true);
        studentsCount = count || 0;
      }
      
      // Count teacher's reports
      const { count: reportsCount } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("teacher_id", user.id);
      
      // If communication officer, get pending reports for their center
      let pendingCount = 0;
      if (isCommunicationOfficer && selectedCenterId) {
        const { data: centerHalaqat } = await supabase
          .from("halaqat")
          .select("id")
          .eq("center_id", selectedCenterId);
        
        const centerHalqaIds = centerHalaqat?.map(h => h.id) || [];
        
        if (centerHalqaIds.length > 0) {
          const { count, data: reports } = await supabase
            .from("reports")
            .select("*, halqa:halaqat(name, center_id)", { count: "exact" })
            .in("halqa_id", centerHalqaIds)
            .eq("status", "pending");
          
          pendingCount = count || 0;
          
          // Fetch teacher names separately
          if (reports && reports.length > 0) {
            const teacherIds = [...new Set(reports.map(r => r.teacher_id).filter(Boolean))];
            const { data: teachers } = await supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", teacherIds);
            
            const teacherMap = new Map(teachers?.map(t => [t.id, t.full_name]) || []);
            
            const reportsWithTeachers = reports.map(r => ({
              ...r,
              teacher: r.teacher_id ? { full_name: teacherMap.get(r.teacher_id) || "غير معروف" } : undefined
            }));
            setPendingReports(reportsWithTeachers);
          } else {
            setPendingReports([]);
          }
        }
      }
      
      setStats({
        myStudents: studentsCount,
        myReports: reportsCount || 0,
        pendingReports: pendingCount,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("تم تسجيل الخروج بنجاح");
    window.location.reload();
  };

  const handleViewDetails = async (report: Report) => {
    setSelectedReport(report);
    setViewDetailsOpen(true);
    setLoadingDetails(true);
    
    try {
      // Fetch report entries with students
      const { data: entries } = await supabase
        .from("report_entries")
        .select("*, student:students(full_name)")
        .eq("report_id", report.id);
      
      if (entries) {
        // Fetch recitations for each entry
        const entriesWithRecitations = await Promise.all(
          entries.map(async (entry) => {
            const { data: recitations } = await supabase
              .from("recitations")
              .select("surah, from_ayah, to_ayah, type, grade")
              .eq("report_entry_id", entry.id);
            
            return {
              ...entry,
              recitations: recitations || []
            };
          })
        );
        setReportEntries(entriesWithRecitations);
      }
    } catch (error) {
      console.error("Error fetching report details:", error);
      toast.error("خطأ في جلب تفاصيل التقرير");
    } finally {
      setLoadingDetails(false);
    }
  };

  const openRejectDialog = (report: Report) => {
    setRejectingReport(report);
    setRejectionNote("");
    setRejectDialogOpen(true);
  };

  const handleRejectWithNote = async () => {
    if (!rejectingReport) return;
    
    setIsReviewing(rejectingReport.id);
    try {
      const { error } = await supabase.functions.invoke("admin-operations", {
        body: {
          operation: "update",
          table: "reports",
          id: rejectingReport.id,
          data: {
            status: "rejected",
            reviewer_id: user?.id,
            review_notes: rejectionNote || null,
          },
        },
      });

      if (error) throw error;
      
      toast.success("تم رفض التقرير");
      setRejectDialogOpen(false);
      setRejectingReport(null);
      setRejectionNote("");
      fetchDashboardData();
    } catch (error) {
      console.error("Error rejecting report:", error);
      toast.error("خطأ في رفض التقرير");
    } finally {
      setIsReviewing(null);
    }
  };

  const handleApproveReport = async (reportId: string) => {
    setIsReviewing(reportId);
    try {
      const { error } = await supabase.functions.invoke("admin-operations", {
        body: {
          operation: "update",
          table: "reports",
          id: reportId,
          data: {
            status: "approved",
            reviewer_id: user?.id,
          },
        },
      });

      if (error) throw error;
      
      toast.success("تم اعتماد التقرير");
      fetchDashboardData();
    } catch (error) {
      console.error("Error approving report:", error);
      toast.error("خطأ في اعتماد التقرير");
    } finally {
      setIsReviewing(null);
    }
  };

  const getAttendanceLabel = (status: string) => {
    switch (status) {
      case "present": return "حاضر";
      case "absent": return "غائب";
      case "absent_with_permission": return "غائب بإذن";
      case "escaped": return "هارب";
      default: return status;
    }
  };

  const getRecitationTypeLabel = (type: string) => {
    switch (type) {
      case "new_memorization": return "حفظ جديد";
      case "review": return "مراجعة";
      case "recitation": return "تلاوة";
      case "talqeen": return "تلقين";
      default: return type;
    }
  };

  const getRoleBadge = () => {
    if (isCommunicationOfficer) {
      return (
        <Badge variant="secondary" className="mt-1 bg-primary-foreground/20 text-primary-foreground">
          مسؤول التواصل
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="mt-1 bg-primary-foreground/20 text-primary-foreground">
        معلم
      </Badge>
    );
  };

  const STATS_CONFIG = [
    { label: "طلابي", value: stats.myStudents.toString(), icon: Users, color: "primary" },
    { label: "تقاريري", value: stats.myReports.toString(), icon: FileText, color: "secondary" },
    ...(isCommunicationOfficer ? [{ label: "تقارير بانتظار المراجعة", value: stats.pendingReports.toString(), icon: Clock, color: "primary" }] : []),
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "reports":
        return <DailyReports />;
      case "review":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">مراجعة التقارير</h2>
            {pendingReports.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="font-medium text-foreground">لا توجد تقارير بانتظار المراجعة</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  جميع التقارير تمت مراجعتها
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingReports.map((report) => (
                  <Card key={report.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{report.halqa?.name || "حلقة غير معروفة"}</h3>
                          <p className="text-sm text-muted-foreground">
                            المعلم: {report.teacher?.full_name || "غير معروف"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(report.report_date).toLocaleDateString("ar-SA")}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => handleViewDetails(report)}
                        >
                          <Eye className="w-4 h-4" />
                          التفاصيل
                        </Button>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-destructive hover:text-destructive"
                          onClick={() => openRejectDialog(report)}
                          disabled={isReviewing === report.id}
                        >
                          <XCircle className="w-4 h-4" />
                          رفض
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={() => handleApproveReport(report.id)}
                          disabled={isReviewing === report.id}
                        >
                          {isReviewing === report.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          اعتماد
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      case "holidays":
        return <HolidaysManagement />;
      case "leaderboard":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">قائمة المتصدرين</h2>
            <StudentLeaderboard limit={20} />
          </div>
        );
      case "notifications":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">الإشعارات</h2>
            <Card className="p-8 text-center">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground mt-4">لا توجد إشعارات جديدة</p>
            </Card>
          </div>
        );
      case "settings":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">الإعدادات</h2>
            <UserSettings />
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-foreground">تسجيل الخروج</span>
                <Button variant="destructive" onClick={handleSignOut} className="gap-2">
                  <LogOut className="w-4 h-4" />
                  خروج
                </Button>
              </div>
            </Card>
          </div>
        );
      default:
        return (
          <>
            <div className="grid grid-cols-2 gap-3">
              {STATS_CONFIG.map((stat) => (
                <Card 
                  key={stat.label}
                  className="p-4 bg-card border-border/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">الوصول السريع</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab("reports")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50 hover:bg-accent/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm text-foreground font-medium">التقارير اليومية</span>
                </button>
                
                {isCommunicationOfficer && (
                  <button
                    onClick={() => setActiveTab("review")}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50 hover:bg-accent/50 transition-colors relative"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-sm text-foreground font-medium">مراجعة التقارير</span>
                    {stats.pendingReports > 0 && (
                      <Badge className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground">
                        {stats.pendingReports}
                      </Badge>
                    )}
                  </button>
                )}
                
                {isCommunicationOfficer && (
                  <button
                    onClick={() => setActiveTab("holidays")}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50 hover:bg-accent/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CalendarDays className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-sm text-foreground font-medium">العطلات</span>
                  </button>
                )}
                
                <button
                  onClick={() => setActiveTab("leaderboard")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50 hover:bg-accent/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                  </div>
                  <span className="text-sm text-foreground font-medium">المتصدرين</span>
                </button>
              </div>
            </section>
          </>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground mt-4">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "home", icon: LayoutDashboard, label: "الرئيسية" },
    { id: "reports", icon: FileText, label: "التقارير" },
    ...(isCommunicationOfficer ? [{ id: "review", icon: CheckCircle, label: "المراجعة" }] : []),
    { id: "notifications", icon: Bell, label: "الإشعارات" },
    { id: "settings", icon: Settings, label: "الإعدادات" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/80 text-sm">مرحباً بك</p>
              <h1 className="text-xl font-bold">
                {profile?.full_name || user?.email || "المعلم"}
              </h1>
              {getRoleBadge()}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="icon" 
                variant="ghost" 
                className="text-primary-foreground hover:bg-primary-foreground/10 relative"
              >
                <Bell className="w-5 h-5" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="text-primary-foreground hover:bg-primary-foreground/10"
                onClick={handleSignOut}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
        <div className="h-6 bg-background rounded-t-3xl" />
      </header>

      <main className="px-4 -mt-2 space-y-6">
        {renderTabContent()}
      </main>

      <nav className="nav-float">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض التقرير</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                الحلقة: {rejectingReport?.halqa?.name}
              </p>
              <p className="text-sm text-muted-foreground">
                المعلم: {rejectingReport?.teacher?.full_name}
              </p>
            </div>
            <div className="space-y-2">
              <Label>سبب الرفض (اختياري)</Label>
              <Textarea
                placeholder="أدخل سبب رفض التقرير..."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className="h-24"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectWithNote}
              disabled={isReviewing === rejectingReport?.id}
            >
              {isReviewing === rejectingReport?.id ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : null}
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل التقرير</DialogTitle>
          </DialogHeader>
          {loadingDetails ? (
            <div className="py-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">جاري التحميل...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p><strong>الحلقة:</strong> {selectedReport?.halqa?.name}</p>
                <p><strong>المعلم:</strong> {selectedReport?.teacher?.full_name}</p>
                <p><strong>التاريخ:</strong> {selectedReport?.report_date && new Date(selectedReport.report_date).toLocaleDateString("ar-SA")}</p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">الطلاب ({reportEntries.length})</h4>
                {reportEntries.map((entry) => (
                  <Card key={entry.id} className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{entry.student?.full_name}</span>
                        <Badge variant={entry.attendance_status === "present" ? "default" : "secondary"}>
                          {getAttendanceLabel(entry.attendance_status)}
                        </Badge>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground">
                          ملاحظات: {entry.notes}
                        </p>
                      )}
                      {entry.recitations && entry.recitations.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-medium">التسميع:</p>
                          {entry.recitations.map((rec, idx) => (
                            <div key={idx} className="text-sm bg-muted/50 p-2 rounded flex justify-between">
                              <span>
                                {rec.surah} ({rec.from_ayah} - {rec.to_ayah})
                              </span>
                              <span className="flex gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {getRecitationTypeLabel(rec.type)}
                                </Badge>
                                {rec.grade !== null && (
                                  <Badge className="text-xs">{rec.grade}/10</Badge>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
