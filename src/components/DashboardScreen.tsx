import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Bell, 
  Settings,
  BookOpen,
  Calendar,
  UserCheck,
  AlertCircle,
  ChevronLeft,
  GraduationCap,
  Wallet,
  LogOut,
  Loader2,
  Building2,
  Plus
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TabType = "home" | "students" | "reports" | "notifications" | "settings";

interface Stats {
  totalStudents: number;
  activeHalaqat: number;
  totalTeachers: number;
  attendanceRate: number;
}

interface RecentReport {
  id: string;
  teacher_name: string;
  halqa_name: string;
  report_date: string;
  status: string;
}

export const DashboardScreen = () => {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const { user, profile, signOut, isSuperAdmin, selectedCenterId } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    activeHalaqat: 0,
    totalTeachers: 0,
    attendanceRate: 0,
  });
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedCenterId, isSuperAdmin]);

  const fetchDashboardData = async () => {
    try {
      // Fetch students count
      let studentsQuery = supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      
      if (!isSuperAdmin && selectedCenterId) {
        studentsQuery = studentsQuery.eq("center_id", selectedCenterId);
      }
      
      const { count: studentsCount } = await studentsQuery;

      // Fetch halaqat count
      let halaqatQuery = supabase
        .from("halaqat")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      
      if (!isSuperAdmin && selectedCenterId) {
        halaqatQuery = halaqatQuery.eq("center_id", selectedCenterId);
      }
      
      const { count: halaqatCount } = await halaqatQuery;

      // Fetch teachers count (users with teacher role)
      const { count: teachersCount } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "teacher");

      setStats({
        totalStudents: studentsCount || 0,
        activeHalaqat: halaqatCount || 0,
        totalTeachers: teachersCount || 0,
        attendanceRate: 0, // Will calculate from reports
      });

      // Fetch recent reports
      let reportsQuery = supabase
        .from("reports")
        .select(`
          id,
          report_date,
          status,
          halaqat!inner(name, center_id),
          profiles!reports_teacher_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!isSuperAdmin && selectedCenterId) {
        reportsQuery = reportsQuery.eq("halaqat.center_id", selectedCenterId);
      }

      const { data: reportsData } = await reportsQuery;

      if (reportsData) {
        setRecentReports(
          reportsData.map((r: any) => ({
            id: r.id,
            teacher_name: r.profiles?.full_name || "غير معروف",
            halqa_name: r.halaqat?.name || "غير معروف",
            report_date: r.report_date,
            status: r.status,
          }))
        );
      }
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "اليوم";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "أمس";
    } else {
      return date.toLocaleDateString("ar-SA");
    }
  };

  const STATS_CONFIG = [
    { label: "إجمالي الطلاب", value: stats.totalStudents.toString(), icon: Users, color: "primary" },
    { label: "الحلقات النشطة", value: stats.activeHalaqat.toString(), icon: BookOpen, color: "secondary" },
    { label: "المعلمين", value: stats.totalTeachers.toString(), icon: GraduationCap, color: "primary" },
    { label: "نسبة الحضور", value: `${stats.attendanceRate}%`, icon: UserCheck, color: "secondary" },
  ];

  const QUICK_ACTIONS = [
    { label: "إضافة تقرير", icon: FileText, href: "#" },
    { label: "إدارة الحلقات", icon: BookOpen, href: "#" },
    { label: "الرسوم", icon: Wallet, href: "#" },
    { label: "الإعلانات", icon: Bell, href: "#" },
  ];

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

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/80 text-sm">مرحباً بك</p>
              <h1 className="text-xl font-bold">
                {profile?.full_name || user?.email || "مسؤول النظام"}
              </h1>
              {isSuperAdmin && (
                <Badge variant="secondary" className="mt-1 bg-primary-foreground/20 text-primary-foreground">
                  مسؤول النظام
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="icon" 
                variant="ghost" 
                className="text-primary-foreground hover:bg-primary-foreground/10 relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-secondary rounded-full" />
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
        
        {/* Curved bottom */}
        <div className="h-6 bg-background rounded-t-3xl" />
      </header>

      {/* Main Content */}
      <main className="px-4 -mt-2 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {STATS_CONFIG.map((stat, index) => (
            <Card 
              key={stat.label}
              className="p-4 bg-card border-border/50 animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
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

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            إجراءات سريعة
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action, index) => (
              <button
                key={action.label}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border/50 hover:bg-accent/50 transition-colors animate-slide-up"
                style={{ animationDelay: `${(index + 4) * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <action.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs text-foreground font-medium text-center">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Today's Summary */}
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">ملخص اليوم</h3>
              <p className="text-sm text-muted-foreground">
                {recentReports.length} تقارير جديدة
              </p>
            </div>
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </div>
        </Card>

        {/* Recent Reports */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">
              آخر التقارير
            </h2>
            <Button variant="ghost" size="sm" className="text-primary">
              عرض الكل
            </Button>
          </div>
          <div className="space-y-3">
            {recentReports.length > 0 ? (
              recentReports.map((report, index) => (
                <Card 
                  key={report.id}
                  className="p-4 bg-card border-border/50 animate-slide-up"
                  style={{ animationDelay: `${(index + 8) * 0.1}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground truncate">
                          {report.teacher_name}
                        </h4>
                        <Badge 
                          variant={report.status === "approved" ? "default" : "secondary"}
                          className={report.status === "approved" 
                            ? "bg-primary/10 text-primary hover:bg-primary/20" 
                            : "bg-secondary/50 text-secondary-foreground hover:bg-secondary/60"
                          }
                        >
                          {report.status === "approved" ? "معتمد" : "قيد المراجعة"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {report.halqa_name} • {formatDate(report.report_date)}
                      </p>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 bg-card border-border/50 text-center">
                <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto" />
                <p className="text-muted-foreground mt-4">لا توجد تقارير حتى الآن</p>
              </Card>
            )}
          </div>
        </section>

        {/* Alert Card - Only show if there's data */}
        {stats.totalStudents === 0 && (
          <Card className="p-4 bg-primary/10 border-primary/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground">ابدأ بإضافة البيانات</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  لم يتم إضافة أي طلاب بعد. قم بإضافة الطلاب والحلقات للبدء.
                </p>
              </div>
            </div>
          </Card>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="nav-float">
        <div className="flex items-center gap-1">
          {[
            { id: "home", icon: LayoutDashboard, label: "الرئيسية" },
            { id: "students", icon: Users, label: "الطلاب" },
            { id: "reports", icon: FileText, label: "التقارير" },
            { id: "notifications", icon: Bell, label: "الإشعارات" },
            { id: "settings", icon: Settings, label: "الإعدادات" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
