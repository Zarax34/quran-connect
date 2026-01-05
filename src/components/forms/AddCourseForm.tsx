import { useState, useEffect, useRef } from "react";
import { ArrowRight, Camera, Calendar, MapPin, Users, FileText, Loader2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Halqa {
  id: string;
  name: string;
}

interface Center {
  id: string;
  name: string;
}

interface Teacher {
  id: string;
  full_name: string;
}

interface AddCourseFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AddCourseForm = ({ onClose, onSuccess }: AddCourseFormProps) => {
  const { isSuperAdmin, selectedCenterId } = useAuth();
  const [halaqat, setHalaqat] = useState<Halqa[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    max_participants: "",
    center_id: selectedCenterId || "",
    supervisor_id: "",
    location: "",
    notes: "",
  });

  useEffect(() => {
    fetchHalaqat();
    fetchTeachers();
    if (isSuperAdmin) fetchCenters();
  }, [selectedCenterId, isSuperAdmin]);

  const fetchHalaqat = async () => {
    let query = supabase.from("halaqat").select("id, name").eq("is_active", true);
    if (!isSuperAdmin && selectedCenterId) {
      query = query.eq("center_id", selectedCenterId);
    }
    const { data } = await query;
    setHalaqat(data || []);
  };

  const fetchCenters = async () => {
    const { data } = await supabase.from("centers").select("id, name").eq("is_active", true);
    setCenters(data || []);
  };

  const fetchTeachers = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name");
    setTeachers(data || []);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("يرجى إدخال اسم الدورة");
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      toast.error("يرجى تحديد تاريخ البداية والنهاية");
      return;
    }

    const centerId = formData.center_id || selectedCenterId;
    if (!centerId) {
      toast.error("يرجى اختيار المركز");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await supabase.functions.invoke("admin-operations", {
        body: JSON.stringify({
          action: "insert",
          table: "courses",
          data: {
            name: formData.name.trim(),
            description: formData.description || null,
            start_date: formData.start_date,
            end_date: formData.end_date,
            max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
            center_id: centerId,
            supervisor_id: formData.supervisor_id || null,
          },
        }),
      });

      if (response.error) throw response.error;

      toast.success("تم إضافة الدورة بنجاح");
      onSuccess();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "حدث خطأ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold text-foreground">إضافة دورة جديدة</h1>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 pb-32 space-y-6">
        {/* صورة الدورة */}
        <div className="space-y-2">
          <Label className="text-right block">صورة الدورة (اختياري)</Label>
          <div 
            className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="صورة الدورة" className="max-h-32 rounded-lg object-contain" />
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <ImagePlus className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">اضغط لرفع صورة من الاستوديو</p>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>

        {/* اسم الدورة */}
        <div className="space-y-2">
          <Label>اسم الدورة *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="أدخل اسم الدورة التدريبية"
            className="text-right"
          />
        </div>

        {/* التواريخ */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>تاريخ الانتهاء</Label>
            <div className="relative">
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>تاريخ البدء *</Label>
            <div className="relative">
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* تفاصيل الدورة */}
        <div className="space-y-2">
          <Label>تفاصيل الدورة</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="اكتب وصفاً شاملاً لمحتوى الدورة وأهدافها..."
            className="min-h-[100px]"
          />
        </div>

        {/* الفئة المستهدفة */}
        <div className="space-y-2">
          <Label>الفئة المستهدفة</Label>
          <div className="relative">
            <Select>
              <SelectTrigger className="pr-10">
                <SelectValue placeholder="اختر الحلقات أو الطلاب" />
              </SelectTrigger>
              <SelectContent>
                {halaqat.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* المركز */}
        {isSuperAdmin && (
          <div className="space-y-2">
            <Label>المركز *</Label>
            <Select value={formData.center_id} onValueChange={(v) => setFormData({ ...formData, center_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المركز" />
              </SelectTrigger>
              <SelectContent>
                {centers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* المعلم المسؤول */}
        <div className="space-y-2">
          <Label>المعلم المسؤول</Label>
          <div className="relative">
            <Select value={formData.supervisor_id} onValueChange={(v) => setFormData({ ...formData, supervisor_id: v })}>
              <SelectTrigger className="pr-10">
                <SelectValue placeholder="اختر المعلم" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* مكان الإقامة */}
        <div className="space-y-2">
          <Label>مكان الإقامة (اختياري)</Label>
          <div className="relative">
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="مثال: القاعة الرئيسية"
              className="text-right pr-10"
            />
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* الحد الأقصى */}
        <div className="space-y-2">
          <Label>الحد الأقصى للمشاركين (اختياري)</Label>
          <Input
            type="number"
            value={formData.max_participants}
            onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
            placeholder="اتركه فارغاً لعدد غير محدود"
            className="text-right"
          />
        </div>

        {/* ملاحظات */}
        <div className="space-y-2">
          <Label>ملاحظات (اختياري)</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="أي ملاحظات إضافية للإدارة..."
            className="min-h-[80px]"
          />
        </div>
      </form>

      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 space-y-3">
        <Button 
          type="submit" 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-12"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "إضافة الدورة"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="w-full h-10 text-muted-foreground">
          إلغاء
        </Button>
      </div>
    </div>
  );
};
