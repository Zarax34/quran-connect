import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Award, 
  Loader2,
  Star,
  ArrowRightLeft,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface BadgeSetting {
  id: string;
  name: string;
  description: string | null;
  points_value: number;
  icon_name: string;
}

interface StudentBadge {
  id: string;
  earned_at: string;
  badge_settings: BadgeSetting;
}

interface StudentBadgesProps {
  studentId: string;
}

export const StudentBadges = ({ studentId }: StudentBadgesProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [badges, setBadges] = useState<StudentBadge[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeSetting[]>([]);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [availableBadges, setAvailableBadges] = useState(0);
  const [convertAmount, setConvertAmount] = useState(1);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    fetchBadgesData();
  }, [studentId]);

  const fetchBadgesData = async () => {
    try {
      // جلب شارات الطالب
      const { data: studentBadges } = await supabase
        .from("student_badges")
        .select(`
          id,
          earned_at,
          badge_settings (*)
        `)
        .eq("student_id", studentId)
        .order("earned_at", { ascending: false });

      setBadges((studentBadges as any) || []);

      // جلب جميع الشارات المتاحة
      const { data: allBadgesData } = await supabase
        .from("badge_settings")
        .select("*")
        .eq("is_active", true);

      setAllBadges(allBadgesData || []);

      // جلب النقاط المتاحة
      const { data: pointsData } = await supabase
        .rpc("get_student_available_points", { _student_id: studentId });
      setAvailablePoints(pointsData || 0);

      // جلب الشارات المتاحة
      const { data: badgesData } = await supabase
        .rpc("get_student_available_badges", { _student_id: studentId });
      setAvailableBadges(badgesData || 0);
    } catch (error) {
      console.error("Error fetching badges:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertPointsToBadges = async () => {
    const pointsNeeded = convertAmount * 10;
    if (pointsNeeded > availablePoints) {
      toast.error("لا تملك نقاط كافية");
      return;
    }

    setIsConverting(true);
    try {
      const { error } = await supabase.from("points_conversions").insert({
        student_id: studentId,
        conversion_type: "points_to_badges",
        amount: convertAmount,
        result: convertAmount
      });

      if (error) throw error;

      toast.success(`تم تحويل ${pointsNeeded} نقطة إلى ${convertAmount} شارة`);
      fetchBadgesData();
    } catch (error) {
      console.error("Error converting:", error);
      toast.error("حدث خطأ أثناء التحويل");
    } finally {
      setIsConverting(false);
    }
  };

  const handleConvertBadgesToPoints = async () => {
    if (convertAmount > availableBadges) {
      toast.error("لا تملك شارات كافية");
      return;
    }

    setIsConverting(true);
    try {
      const pointsResult = convertAmount * 10;
      const { error } = await supabase.from("points_conversions").insert({
        student_id: studentId,
        conversion_type: "badges_to_points",
        amount: convertAmount,
        result: pointsResult
      });

      if (error) throw error;

      toast.success(`تم تحويل ${convertAmount} شارة إلى ${pointsResult} نقطة`);
      fetchBadgesData();
    } catch (error) {
      console.error("Error converting:", error);
      toast.error("حدث خطأ أثناء التحويل");
    } finally {
      setIsConverting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const earnedBadgeIds = badges.map(b => b.badge_settings?.id);
  const unearnedBadges = allBadges.filter(b => !earnedBadgeIds.includes(b.id));

  return (
    <div className="space-y-4">
      {/* ملخص */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4 pb-4 text-center">
            <Star className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-primary">{availablePoints}</p>
            <p className="text-xs text-muted-foreground">نقاط متاحة</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-100/50 to-amber-50/30 dark:from-amber-900/20 dark:to-amber-800/10">
          <CardContent className="pt-4 pb-4 text-center">
            <Award className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-600">{availableBadges}</p>
            <p className="text-xs text-muted-foreground">شارات متاحة</p>
          </CardContent>
        </Card>
      </div>

      {/* تحويل النقاط */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            تحويل النقاط والشارات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            10 نقاط = 1 شارة (والعكس صحيح)
          </p>
          <div className="flex gap-2 items-center mb-3">
            <Input
              type="number"
              min={1}
              value={convertAmount}
              onChange={(e) => setConvertAmount(parseInt(e.target.value) || 1)}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">
              = {convertAmount * 10} نقطة أو {convertAmount} شارة
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleConvertPointsToBadges}
              disabled={isConverting || convertAmount * 10 > availablePoints}
            >
              {isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 ml-1" />}
              نقاط → شارات
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleConvertBadgesToPoints}
              disabled={isConverting || convertAmount > availableBadges}
            >
              {isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 ml-1" />}
              شارات → نقاط
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* الشارات المكتسبة */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            شاراتي المكتسبة ({badges.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {badges.length === 0 ? (
            <div className="text-center py-6">
              <Award className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">لم تكتسب شارات بعد</p>
              <p className="text-sm text-muted-foreground">استمر في التفوق لتحصل على الشارات!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {badges.map(badge => (
                <div 
                  key={badge.id}
                  className="p-3 bg-gradient-to-br from-amber-100/50 to-amber-50/30 dark:from-amber-900/20 dark:to-amber-800/10 rounded-lg text-center"
                >
                  <Award className="w-8 h-8 text-amber-500 mx-auto mb-1" />
                  <p className="font-medium text-foreground text-sm">{badge.badge_settings?.name}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {badge.badge_settings?.points_value} نقطة
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(badge.earned_at), "d MMM yyyy", { locale: ar })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* الشارات المتاحة */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-4 h-4" />
            شارات يمكن اكتسابها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {unearnedBadges.map(badge => (
              <div 
                key={badge.id}
                className="p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Award className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{badge.name}</p>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{badge.points_value} نقطة</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};