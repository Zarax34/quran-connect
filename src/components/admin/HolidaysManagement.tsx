import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Halqa {
  id: string;
  name: string;
}

interface Holiday {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  center_id: string | null;
  halaqat: { id: string; name: string }[];
}

export const HolidaysManagement = () => {
  const { selectedCenterId, isSuperAdmin } = useAuth();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [halaqat, setHalaqat] = useState<Halqa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    reason: "",
    selectedHalaqat: [] as string[],
    isSingleDay: true,
  });

  useEffect(() => {
    fetchData();
  }, [selectedCenterId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch halaqat
      let halaqatQuery = supabase
        .from("halaqat")
        .select("id, name")
        .eq("is_active", true);

      if (!isSuperAdmin && selectedCenterId) {
        halaqatQuery = halaqatQuery.eq("center_id", selectedCenterId);
      }

      const { data: halaqatData } = await halaqatQuery;
      setHalaqat(halaqatData || []);

      // Fetch holidays
      let holidaysQuery = supabase
        .from("holidays")
        .select("*")
        .order("start_date", { ascending: false });

      if (!isSuperAdmin && selectedCenterId) {
        holidaysQuery = holidaysQuery.eq("center_id", selectedCenterId);
      }

      const { data: holidaysData } = await holidaysQuery;

      // Fetch holiday_halaqat relationships
      if (holidaysData && holidaysData.length > 0) {
        const holidayIds = holidaysData.map((h) => h.id);
        const { data: holidayHalaqatData } = await supabase
          .from("holiday_halaqat")
          .select("holiday_id, halqa_id")
          .in("holiday_id", holidayIds);

        // Map halaqat to holidays
        const holidaysWithHalaqat = holidaysData.map((holiday) => {
          const relatedHalaqatIds =
            holidayHalaqatData
              ?.filter((hh) => hh.holiday_id === holiday.id)
              .map((hh) => hh.halqa_id) || [];

          const relatedHalaqat =
            halaqatData?.filter((h) => relatedHalaqatIds.includes(h.id)) || [];

          return {
            ...holiday,
            halaqat: relatedHalaqat,
          };
        });

        setHolidays(holidaysWithHalaqat);
      } else {
        setHolidays([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("حدث خطأ أثناء جلب البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.startDate) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (formData.selectedHalaqat.length === 0) {
      toast.error("يرجى اختيار حلقة واحدة على الأقل");
      return;
    }

    setIsSaving(true);
    try {
      const endDate = formData.isSingleDay
        ? formData.startDate
        : formData.endDate || formData.startDate;

      // Insert holiday
      const { data: holidayData, error: holidayError } = await supabase
        .from("holidays")
        .insert({
          name: formData.name,
          start_date: format(formData.startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          reason: formData.reason || null,
          center_id: selectedCenterId || null,
        })
        .select()
        .single();

      if (holidayError) throw holidayError;

      // Insert holiday_halaqat relationships
      const holidayHalaqatInserts = formData.selectedHalaqat.map((halqaId) => ({
        holiday_id: holidayData.id,
        halqa_id: halqaId,
      }));

      const { error: hhError } = await supabase
        .from("holiday_halaqat")
        .insert(holidayHalaqatInserts);

      if (hhError) throw hhError;

      toast.success("تمت إضافة العطلة بنجاح");
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error creating holiday:", error);
      toast.error("حدث خطأ أثناء إضافة العطلة");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (holidayId: string) => {
    try {
      const { error } = await supabase
        .from("holidays")
        .delete()
        .eq("id", holidayId);

      if (error) throw error;

      toast.success("تم حذف العطلة بنجاح");
      fetchData();
    } catch (error) {
      console.error("Error deleting holiday:", error);
      toast.error("حدث خطأ أثناء حذف العطلة");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      startDate: undefined,
      endDate: undefined,
      reason: "",
      selectedHalaqat: [],
      isSingleDay: true,
    });
  };

  const toggleHalqa = (halqaId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedHalaqat: prev.selectedHalaqat.includes(halqaId)
        ? prev.selectedHalaqat.filter((id) => id !== halqaId)
        : [...prev.selectedHalaqat, halqaId],
    }));
  };

  const selectAllHalaqat = () => {
    setFormData((prev) => ({
      ...prev,
      selectedHalaqat: halaqat.map((h) => h.id),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">العطلات</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة عطلة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة عطلة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم العطلة *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="مثال: عطلة نهاية الأسبوع"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="singleDay"
                  checked={formData.isSingleDay}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isSingleDay: checked as boolean })
                  }
                />
                <Label htmlFor="singleDay">يوم واحد فقط</Label>
              </div>

              <div className="space-y-2">
                <Label>
                  {formData.isSingleDay ? "تاريخ العطلة *" : "تاريخ البداية *"}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-right font-normal",
                        !formData.startDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="ml-2 h-4 w-4" />
                      {formData.startDate
                        ? format(formData.startDate, "PPP", { locale: ar })
                        : "اختر التاريخ"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.startDate}
                      onSelect={(date) =>
                        setFormData({ ...formData, startDate: date })
                      }
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {!formData.isSingleDay && (
                <div className="space-y-2">
                  <Label>تاريخ النهاية *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-right font-normal",
                          !formData.endDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="ml-2 h-4 w-4" />
                        {formData.endDate
                          ? format(formData.endDate, "PPP", { locale: ar })
                          : "اختر التاريخ"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={formData.endDate}
                        onSelect={(date) =>
                          setFormData({ ...formData, endDate: date })
                        }
                        disabled={(date) =>
                          formData.startDate
                            ? date < formData.startDate
                            : false
                        }
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">سبب العطلة</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  placeholder="اكتب سبب العطلة..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>الحلقات المشمولة *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAllHalaqat}
                  >
                    تحديد الكل
                  </Button>
                </div>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {halaqat.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center">
                      لا توجد حلقات متاحة
                    </p>
                  ) : (
                    halaqat.map((halqa) => (
                      <div
                        key={halqa.id}
                        className="flex items-center gap-2"
                      >
                        <Checkbox
                          id={`halqa-${halqa.id}`}
                          checked={formData.selectedHalaqat.includes(halqa.id)}
                          onCheckedChange={() => toggleHalqa(halqa.id)}
                        />
                        <Label
                          htmlFor={`halqa-${halqa.id}`}
                          className="font-normal cursor-pointer"
                        >
                          {halqa.name}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
                {formData.selectedHalaqat.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    تم اختيار {formData.selectedHalaqat.length} حلقة
                  </p>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  "حفظ العطلة"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {holidays.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">لا توجد عطلات مسجلة</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {holidays.map((holiday) => (
            <Card key={holiday.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-medium text-foreground">{holiday.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {holiday.start_date === holiday.end_date
                      ? format(new Date(holiday.start_date), "PPP", {
                          locale: ar,
                        })
                      : `${format(new Date(holiday.start_date), "PPP", {
                          locale: ar,
                        })} - ${format(new Date(holiday.end_date), "PPP", {
                          locale: ar,
                        })}`}
                  </p>
                  {holiday.reason && (
                    <p className="text-sm text-muted-foreground">
                      السبب: {holiday.reason}
                    </p>
                  )}
                  {holiday.halaqat.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {holiday.halaqat.map((halqa) => (
                        <span
                          key={halqa.id}
                          className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                        >
                          {halqa.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(holiday.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
