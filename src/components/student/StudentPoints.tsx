import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Star, 
  TrendingUp, 
  Loader2,
  BookOpen,
  CheckCircle,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface PointsRecord {
  id: string;
  points: number;
  reason: string;
  created_at: string;
}

interface StudentPointsProps {
  studentId: string;
}

export const StudentPoints = ({ studentId }: StudentPointsProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [pointsHistory, setPointsHistory] = useState<PointsRecord[]>([]);

  useEffect(() => {
    if (studentId) {
      fetchPoints();
    }
  }, [studentId]);

  const fetchPoints = async () => {
    try {
      // Fetch total points
      const { data: totalData, error: totalError } = await supabase
        .rpc("get_student_total_points", { _student_id: studentId });

      if (totalError) {
        console.error("Error fetching total points:", totalError);
      } else {
        setTotalPoints(totalData || 0);
      }

      // Fetch points history
      const { data: historyData, error: historyError } = await supabase
        .rpc("get_student_points_details", { _student_id: studentId });

      if (historyError) {
        console.error("Error fetching points history:", historyError);
      } else {
        setPointsHistory(historyData || []);
      }
    } catch (error) {
      console.error("Error fetching points:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPointsIcon = (reason: string) => {
    if (reason.includes("حفظ") || reason.includes("مراجعة") || reason.includes("تسميع") || reason.includes("تلقين")) {
      return <BookOpen className="w-4 h-4 text-primary" />;
    }
    if (reason.includes("حضور")) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (reason.includes("غياب")) {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    return <Star className="w-4 h-4 text-amber-500" />;
  };

  const getPointsBadgeVariant = (points: number): "default" | "secondary" | "destructive" | "outline" => {
    if (points > 0) return "default";
    if (points < 0) return "destructive";
    return "secondary";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total Points Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{totalPoints}</p>
              <p className="text-muted-foreground">إجمالي النقاط</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Points Breakdown */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="w-10 h-10 mx-auto rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-lg font-bold text-foreground">5</p>
            <p className="text-xs text-muted-foreground">نقاط الحضور</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="w-10 h-10 mx-auto rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <p className="text-lg font-bold text-foreground">10</p>
            <p className="text-xs text-muted-foreground">حفظ جديد/صفحة</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="w-10 h-10 mx-auto rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-lg font-bold text-foreground">5</p>
            <p className="text-xs text-muted-foreground">مراجعة/صفحة</p>
          </CardContent>
        </Card>
      </div>

      {/* Points History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-4 h-4" />
            سجل النقاط
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pointsHistory.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">لا توجد نقاط مسجلة بعد</p>
              <p className="text-sm text-muted-foreground">ستظهر النقاط هنا بعد تسجيل الحضور والتسميع</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {pointsHistory.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getPointsIcon(record.reason)}
                    <div>
                      <p className="text-sm font-medium text-foreground">{record.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(record.created_at), "d MMMM yyyy", { locale: ar })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getPointsBadgeVariant(record.points)}>
                    {record.points > 0 ? "+" : ""}{record.points}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
