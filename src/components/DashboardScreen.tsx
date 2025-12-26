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
  UserCog,
  ArrowRight,
  CalendarDays,
  Activity,
  Home
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CentersManagement } from "./admin/CentersManagement";
import { StudentsManagement } from "./admin/StudentsManagement";
import { HalaqatManagement } from "./admin/HalaqatManagement";
import { UsersManagement } from "./admin/UsersManagement";
import { AnnouncementsManagement } from "./admin/AnnouncementsManagement";
import { ParentsManagement } from "./admin/ParentsManagement";
import { CoursesManagement } from "./admin/CoursesManagement";
import { ActivitiesManagement } from "./admin/ActivitiesManagement";
import { DailyReports } from "./teacher/DailyReports";
import { ParentDashboard } from "./parent/ParentDashboard";
import { StudentDashboard } from "./student/StudentDashboard";
import { StudentAccountsList } from "./admin/StudentAccountsList";
import { ParentAccountsList } from "./admin/ParentAccountsList";

type TabType = "home" | "students" | "reports" | "notifications" | "settings";
type AdminView = "dashboard" | "centers" | "students" | "halaqat" | "users" | "announcements" | "parents" | "courses" | "activities" | "reports" | "student-accounts" | "parent-accounts";

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
  const [adminView, setAdminView] = useState<AdminView>("dashboard");
  const { user, profile, signOut, isSuperAdmin, selectedCenterId, roles } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    activeHalaqat: 0,
    totalTeachers: 0,
    attendanceRate: 0,
  });
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const isParent = roles.some(r => r.role === "parent");
  const isStudent = roles.some(r => r.role === "student");
  const isAdmin = isSuperAdmin || roles.some(r => r.role === "center_admin");

  useEffect(() => {
    fetchDashboardData();
  }, [selectedCenterId, isSuperAdmin]);

  const fetchDashboardData = async () => {
    try {
      let studentsQuery = supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      
      if (!isSuperAdmin && selectedCenterId) {
        studentsQuery = studentsQuery.eq("center_id", selectedCenterId);
      }
      
      const { count: studentsCount } = await studentsQuery;

      let halaqatQuery = supabase
        .from("halaqat")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      
      if (!isSuperAdmin && selectedCenterId) {
        halaqatQuery = halaqatQuery.eq("center_id", selectedCenterId);
      }
      
      const { count: halaqatCount } = await halaqatQuery;

      const { count: teachersCount } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "teacher");

      setStats({
        totalStudents: studentsCount || 0,
        activeHalaqat: halaqatCount || 0,
        totalTeachers: teachersCount || 0,
        attendanceRate: 0,
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

  const STATS_CONFIG = [
    { label: "إجمالي الطلاب", value: stats.totalStudents.toString(), icon: Users, color: "primary" },
    { label: "الحلقات النشطة", value: stats.activeHalaqat.toString(), icon: BookOpen, color: "secondary" },
    { label: "المعلمين", value: stats.totalTeachers.toString(), icon: GraduationCap, color: "primary" },
    { label: "نسبة الحضور", value: `${stats.attendanceRate}%`, icon: UserCheck, color: "secondary" },
  ];

  const ADMIN_ACTIONS = [
    { label: "المراكز", icon: Building2, view: "centers" as AdminView },
    { label: "الحلقات", icon: BookOpen, view: "halaqat" as AdminView },
    { label: "الطلاب", icon: Users, view: "students" as AdminView },
    { label: "حسابات الطلاب", icon: UserCheck, view: "student-accounts" as AdminView },
    { label: "أولياء الأمور", icon: UserCheck, view: "parents" as AdminView },
    { label: "حسابات أولياء الأمور", icon: UserCog, view: "parent-accounts" as AdminView },
    { label: "المستخدمين", icon: UserCog, view: "users" as AdminView },
    { label: "الدورات", icon: GraduationCap, view: "courses" as AdminView },
    { label: "الأنشطة", icon: Activity, view: "activities" as AdminView },
    { label: "الإعلانات", icon: Bell, view: "announcements" as AdminView },
    { label: "التقارير", icon: FileText, view: "reports" as AdminView },
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

  // Render Parent Dashboard if user is a parent and not admin
  if (isParent && !isAdmin) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
          <div className="px-4 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/80 text-sm">مرحباً بك</p>
                <h1 className="text-xl font-bold">
                  {profile?.full_name || user?.email || "ولي الأمر"}
                </h1>
                <Badge variant="secondary" className="mt-1 bg-primary-foreground/20 text-primary-foreground">
                  ولي أمر
                </Badge>
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
        <main className="px-4 -mt-2">
          <ParentDashboard />
        </main>
      </div>
    );
  }

  // Render Student Dashboard if user is a student and not admin
  if (isStudent && !isAdmin) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
          <div className="px-4 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/80 text-sm">مرحباً بك</p>
                <h1 className="text-xl font-bold">
                  {profile?.full_name || user?.email || "الطالب"}
                </h1>
                <Badge variant="secondary" className="mt-1 bg-primary-foreground/20 text-primary-foreground">
                  طالب
                </Badge>
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
        <main className="px-4 -mt-2">
          <StudentDashboard />
        </main>
      </div>
    );
  }

  // Render admin sub-views
  if (adminView !== "dashboard") {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-4">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" onClick={() => setAdminView("dashboard")}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">
              {adminView === "centers" && "إدارة المراكز"}
              {adminView === "students" && "إدارة الطلاب"}
              {adminView === "halaqat" && "إدارة الحلقات"}
              {adminView === "users" && "إدارة المستخدمين"}
              {adminView === "announcements" && "إدارة الإعلانات"}
              {adminView === "parents" && "إدارة أولياء الأمور"}
              {adminView === "courses" && "إدارة الدورات"}
              {adminView === "activities" && "إدارة الأنشطة"}
              {adminView === "reports" && "التقارير اليومية"}
              {adminView === "student-accounts" && "حسابات الطلاب"}
              {adminView === "parent-accounts" && "حسابات أولياء الأمور"}
            </h1>
          </div>
        </header>
        <main className="px-4 py-6">
          {adminView === "centers" && <CentersManagement />}
          {adminView === "students" && <StudentsManagement />}
          {adminView === "halaqat" && <HalaqatManagement />}
          {adminView === "users" && <UsersManagement />}
          {adminView === "announcements" && <AnnouncementsManagement />}
          {adminView === "parents" && <ParentsManagement />}
          {adminView === "courses" && <CoursesManagement />}
          {adminView === "activities" && <ActivitiesManagement />}
          {adminView === "reports" && <DailyReports />}
          {adminView === "student-accounts" && <StudentAccountsList />}
          {adminView === "parent-accounts" && <ParentAccountsList />}
        </main>
      </div>
    );
  }

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "students":
        return <StudentsManagement />;
      case "reports":
        return <DailyReports />;
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
            <Card className="p-4 space-y-4">
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
              {STATS_CONFIG.map((stat, index) => (
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
              <h2 className="text-lg font-semibold text-foreground mb-3">الإدارة</h2>
              <div className="grid grid-cols-3 gap-3">
                {ADMIN_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => setAdminView(action.view)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border/50 hover:bg-accent/50 transition-colors"
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
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
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
