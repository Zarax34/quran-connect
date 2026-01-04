import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Loader2, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LeaderboardEntry {
  student_id: string;
  student_name: string;
  halqa_name: string | null;
  total_points: number;
  rank: number;
}

interface StudentLeaderboardProps {
  halqaId?: string;
  limit?: number;
  showTitle?: boolean;
  currentStudentId?: string;
}

export const StudentLeaderboard = ({ 
  halqaId, 
  limit = 10, 
  showTitle = true,
  currentStudentId 
}: StudentLeaderboardProps) => {
  const { selectedCenterId, isSuperAdmin } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [halqaId, selectedCenterId, limit]);

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);

      // Get students with their points
      let studentsQuery = supabase
        .from("students")
        .select(`
          id,
          full_name,
          halqa_id,
          halaqat (name)
        `)
        .eq("is_active", true);

      // Filter by halqa if specified
      if (halqaId) {
        studentsQuery = studentsQuery.eq("halqa_id", halqaId);
      } else if (!isSuperAdmin && selectedCenterId) {
        studentsQuery = studentsQuery.eq("center_id", selectedCenterId);
      }

      const { data: students, error: studentsError } = await studentsQuery;

      if (studentsError) throw studentsError;

      if (!students || students.length === 0) {
        setLeaderboard([]);
        return;
      }

      // Get points for all students
      const studentIds = students.map(s => s.id);
      const { data: pointsData, error: pointsError } = await supabase
        .from("student_points")
        .select("student_id, points")
        .in("student_id", studentIds);

      if (pointsError) throw pointsError;

      // Calculate total points per student
      const pointsMap = new Map<string, number>();
      (pointsData || []).forEach(p => {
        const current = pointsMap.get(p.student_id) || 0;
        pointsMap.set(p.student_id, current + p.points);
      });

      // Build leaderboard
      const entries: LeaderboardEntry[] = students.map(s => ({
        student_id: s.id,
        student_name: s.full_name,
        halqa_name: s.halaqat?.name || null,
        total_points: pointsMap.get(s.id) || 0,
        rank: 0
      }));

      // Sort by points descending
      entries.sort((a, b) => b.total_points - a.total_points);

      // Assign ranks
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      // Limit results
      setLeaderboard(entries.slice(0, limit));
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 text-center text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getRankBgColor = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return "bg-primary/10 border-primary/30";
    switch (rank) {
      case 1:
        return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
      case 2:
        return "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700";
      case 3:
        return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
      default:
        return "bg-card border-border/50";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">لا توجد بيانات للترتيب حالياً</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            قائمة المتصدرين
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showTitle ? "" : "pt-4"}>
        <div className="space-y-2">
          {leaderboard.map((entry) => {
            const isCurrentUser = entry.student_id === currentStudentId;
            
            return (
              <div
                key={entry.student_id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${getRankBgColor(entry.rank, isCurrentUser)}`}
              >
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(entry.rank)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isCurrentUser ? "text-primary" : "text-foreground"}`}>
                    {entry.student_name}
                    {isCurrentUser && <span className="text-xs mr-1">(أنت)</span>}
                  </p>
                  {entry.halqa_name && (
                    <p className="text-xs text-muted-foreground truncate">{entry.halqa_name}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <Award className="w-4 h-4 text-primary" />
                  <span className="font-bold text-primary">{entry.total_points}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
