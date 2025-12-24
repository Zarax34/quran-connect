import { useState } from "react";
import { Building2, MapPin, Users, Search, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface Center {
  id: string;
  name: string;
  location: string;
  studentsCount: number;
  image?: string;
}

const MOCK_CENTERS: Center[] = [
  {
    id: "1",
    name: "مركز النور للتحفيظ",
    location: "الرياض - حي النزهة",
    studentsCount: 150,
  },
  {
    id: "2",
    name: "مركز الهدى القرآني",
    location: "جدة - حي الصفا",
    studentsCount: 200,
  },
  {
    id: "3",
    name: "جمعية تحفيظ القرآن",
    location: "مكة المكرمة",
    studentsCount: 320,
  },
  {
    id: "4",
    name: "مركز الفرقان",
    location: "المدينة المنورة",
    studentsCount: 180,
  },
];

interface Props {
  onSelectCenter: (centerId: string) => void;
}

export const CenterSelectionScreen = ({ onSelectCenter }: Props) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCenters = MOCK_CENTERS.filter(
    (center) =>
      center.name.includes(searchQuery) || center.location.includes(searchQuery)
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
        {filteredCenters.map((center, index) => (
          <Card
            key={center.id}
            onClick={() => onSelectCenter(center.name)}
            className="p-4 cursor-pointer bg-card hover:bg-accent/50 border-border/50 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 animate-slide-up group"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Building2 className="w-7 h-7 text-primary" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-lg truncate">
                  {center.name}
                </h3>
                <div className="flex items-center gap-1 text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="text-sm truncate">{center.location}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground mt-1">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{center.studentsCount} طالب</span>
                </div>
              </div>

              {/* Arrow */}
              <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>
        ))}

        {filteredCenters.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground mt-4">
              لم يتم العثور على مراكز
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
