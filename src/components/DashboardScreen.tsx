import { useState } from "react";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Bell, 
  Settings,
  BookOpen,
  TrendingUp,
  Calendar,
  UserCheck,
  AlertCircle,
  ChevronLeft,
  GraduationCap,
  Wallet
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type TabType = "home" | "students" | "reports" | "notifications" | "settings";

const STATS = [
  { label: "إجمالي الطلاب", value: "324", icon: Users, color: "primary" },
  { label: "الحلقات النشطة", value: "12", icon: BookOpen, color: "secondary" },
  { label: "المعلمين", value: "18", icon: GraduationCap, color: "info" },
  { label: "نسبة الحضور", value: "87%", icon: UserCheck, color: "success" },
];

const QUICK_ACTIONS = [
  { label: "إضافة تقرير", icon: FileText, href: "#" },
  { label: "إدارة الحلقات", icon: BookOpen, href: "#" },
  { label: "الرسوم", icon: Wallet, href: "#" },
  { label: "الإعلانات", icon: Bell, href: "#" },
];

const RECENT_REPORTS = [
  { 
    id: 1, 
    teacher: "أحمد محمد", 
    halqa: "حلقة الفجر", 
    date: "اليوم", 
    status: "pending" 
  },
  { 
    id: 2, 
    teacher: "عبدالله علي", 
    halqa: "حلقة العصر", 
    date: "أمس", 
    status: "approved" 
  },
  { 
    id: 3, 
    teacher: "محمد خالد", 
    halqa: "حلقة المغرب", 
    date: "منذ يومين", 
    status: "approved" 
  },
];

export const DashboardScreen = () => {
  const [activeTab, setActiveTab] = useState<TabType>("home");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/80 text-sm">مرحباً بك</p>
              <h1 className="text-xl font-bold">مسؤول النظام</h1>
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
          {STATS.map((stat, index) => (
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
                <div className={`w-10 h-10 rounded-xl bg-${stat.color}/10 flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}`} />
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
                3 تقارير جديدة • 5 طلاب غائبين
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
            {RECENT_REPORTS.map((report, index) => (
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
                        {report.teacher}
                      </h4>
                      <Badge 
                        variant={report.status === "approved" ? "default" : "secondary"}
                        className={report.status === "approved" 
                          ? "bg-success/10 text-success hover:bg-success/20" 
                          : "bg-warning/10 text-warning hover:bg-warning/20"
                        }
                      >
                        {report.status === "approved" ? "معتمد" : "قيد المراجعة"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {report.halqa} • {report.date}
                    </p>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Alert Card */}
        <Card className="p-4 bg-warning/10 border-warning/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-foreground">تنبيه مهم</h4>
              <p className="text-sm text-muted-foreground mt-1">
                يوجد 12 طالب لم يسددوا رسوم الشهر الحالي
              </p>
            </div>
          </div>
        </Card>
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
