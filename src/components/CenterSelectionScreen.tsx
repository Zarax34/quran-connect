import { useState, useEffect } from "react";
import { Building2, MapPin, Users, Search, ChevronLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Center {
  id: string;
  name: string;
  location: string | null;
  students_count?: number;
  logo_url?: string | null;
}

interface Props {
  onSelectCenter: (centerId: string, centerName: string) => void;
}

export const CenterSelectionScreen = ({ onSelectCenter }: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const { data, error } = await supabase
          .from("centers")
          .select("id, name, location, logo_url")
          .eq("is_active", true)
          .order("name");

        if (error) {
          console.error("Error fetching centers:", error);
          return;
        }

        // Fetch students count for each center
        const centersWithCount = await Promise.all(
          (data || []).map(async (center) => {
            const { count } = await supabase
              .from("students")
              .select("*", { count: "exact", head: true })
              .eq("center_id", center.id)
              .eq("is_active", true);
            
            return {
              ...center,
              students_count: count || 0,
            };
          })
        );

        setCenters(centersWithCount);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCenters();
  }, []);

  const filteredCenters = centers.filter(
    (center) =>
      center.name.includes(searchQuery) || 
      (center.location && center.location.includes(searchQuery))
  );

  return (
    <div className="min-h-screen bg-background islamic-pattern">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50 px-4 py-6">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              اختر مركز التحفيظ
            </h1>
            <p className="text-muted-foreground mt-1">
              حدد المركز الذي تنتمي إليه
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="ابحث عن مركز..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 h-12 bg-card border-border/50 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Centers List */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-muted-foreground mt-4">جاري تحميل المراكز...</p>
          </div>
        ) : filteredCenters.length > 0 ? (
          filteredCenters.map((center, index) => (
            <Card
              key={center.id}
              onClick={() => onSelectCenter(center.id, center.name)}
              className="p-4 cursor-pointer bg-card hover:bg-accent/50 border-border/50 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 animate-slide-up group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-4">
                {/* Icon/Logo */}
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors overflow-hidden">
                  {center.logo_url ? (
                    <img src={center.logo_url} alt={center.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-7 h-7 text-primary" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-lg truncate">
                    {center.name}
                  </h3>
                  {center.location && (
                    <div className="flex items-center gap-1 text-muted-foreground mt-1">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="text-sm truncate">{center.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-muted-foreground mt-1">
                    <Users className="w-4 h-4 shrink-0" />
                    <span className="text-sm">{center.students_count || 0} طالب</span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground mt-4">
              {centers.length === 0 
                ? "لا توجد مراكز مسجلة في النظام"
                : "لم يتم العثور على مراكز"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              تواصل مع مسؤول النظام لإضافة المراكز
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
