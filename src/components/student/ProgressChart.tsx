import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, LineChart } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
} from "recharts";
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, subWeeks } from "date-fns";
import { ar } from "date-fns/locale";

interface Recitation {
  id: string;
  surah: string;
  from_ayah: number;
  to_ayah: number;
  type: string;
  grade: number | null;
}

interface ReportEntry {
  id: string;
  report_date: string;
  recitations: Recitation[];
}

interface ProgressChartProps {
  reportEntries: ReportEntry[];
}

export const ProgressChart = ({ reportEntries }: ProgressChartProps) => {
  const weeklyData = useMemo(() => {
    if (reportEntries.length === 0) return [];

    const now = new Date();
    const weeksAgo = subWeeks(now, 7);
    
    // Get all weeks in the range
    const weeks = eachWeekOfInterval(
      { start: weeksAgo, end: now },
      { weekStartsOn: 6 } // Saturday as week start
    );

    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 6 });
      
      // Filter entries for this week
      const weekEntries = reportEntries.filter((entry) => {
        if (!entry.report_date) return false;
        const entryDate = new Date(entry.report_date);
        return entryDate >= weekStart && entryDate <= weekEnd;
      });

      // Calculate total ayahs memorized this week
      let totalAyahs = 0;
      let totalGrades = 0;
      let gradeCount = 0;
      let newMemorization = 0;
      let review = 0;

      weekEntries.forEach((entry) => {
        entry.recitations.forEach((rec) => {
          const ayahCount = rec.to_ayah - rec.from_ayah + 1;
          totalAyahs += ayahCount;
          
          if (rec.grade !== null) {
            totalGrades += rec.grade;
            gradeCount++;
          }

          if (rec.type === "new_memorization") {
            newMemorization += ayahCount;
          } else if (rec.type === "review") {
            review += ayahCount;
          }
        });
      });

      const avgGrade = gradeCount > 0 ? Math.round(totalGrades / gradeCount) : 0;

      return {
        week: format(weekStart, "d MMM", { locale: ar }),
        totalAyahs,
        avgGrade,
        newMemorization,
        review,
        sessions: weekEntries.length,
      };
    });
  }, [reportEntries]);

  const hasData = weeklyData.some((w) => w.totalAyahs > 0 || w.sessions > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart className="w-4 h-4" />
            تقدم الحفظ الأسبوعي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-muted-foreground text-sm">لا توجد بيانات كافية لعرض الرسم البياني</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ayahs Progress Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart className="w-4 h-4" />
            عدد الآيات الأسبوعي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 11 }} 
                  className="fill-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  className="fill-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    direction: "rtl",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      newMemorization: "حفظ جديد",
                      review: "مراجعة",
                    };
                    return [value, labels[name] || name];
                  }}
                />
                <Bar 
                  dataKey="newMemorization" 
                  stackId="a" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 0, 0, 0]}
                  name="حفظ جديد"
                />
                <Bar 
                  dataKey="review" 
                  stackId="a" 
                  fill="hsl(var(--primary) / 0.5)" 
                  radius={[4, 4, 0, 0]}
                  name="مراجعة"
                />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-primary" />
              <span className="text-xs text-muted-foreground">حفظ جديد</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-primary/50" />
              <span className="text-xs text-muted-foreground">مراجعة</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade Progress Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <LineChart className="w-4 h-4" />
            متوسط الدرجات الأسبوعي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 11 }} 
                  className="fill-muted-foreground"
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }} 
                  className="fill-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    direction: "rtl",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [`${value}%`, "متوسط الدرجة"]}
                />
                <Area
                  type="monotone"
                  dataKey="avgGrade"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#gradeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
