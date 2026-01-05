import { useState, useEffect, useRef } from "react";
import { ArrowRight, Camera, User, Phone, Calendar, MapPin, BookOpen, FileText, Loader2 } from "lucide-react";
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

interface CredentialsInfo {
  student: { username: string; password: string };
  parent: { username: string; password: string };
}

interface AddStudentFormProps {
  onClose: () => void;
  onSuccess: (credentials?: CredentialsInfo) => void;
}

export const AddStudentForm = ({ onClose, onSuccess }: AddStudentFormProps) => {
  const { isSuperAdmin, selectedCenterId } = useAuth();
  const [halaqat, setHalaqat] = useState<Halqa[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentPhoto, setStudentPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    age: "",
    birth_place: "",
    birth_date: "",
    phone: "",
    current_residence: "",
    join_date: "",
    halqa_id: "",
    center_id: selectedCenterId || "",
    notes: "",
    // Parent info
    parent_name: "",
    parent_work: "",
    parent_phone: "",
    relationship: "أب",
  });

  useEffect(() => {
    fetchHalaqat();
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStudentPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (studentId: string): Promise<string | null> => {
    if (!studentPhoto) return null;
    const fileExt = studentPhoto.name.split('.').pop();
    const fileName = `${studentId}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('student-photos')
      .upload(fileName, studentPhoto, { upsert: true });
    
    if (error) return null;
    
    const { data } = supabase.storage.from('student-photos').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name.trim()) {
      toast.error("يرجى إدخال اسم الطالب");
      return;
    }
    
    const centerId = formData.center_id || selectedCenterId;
    if (!centerId) {
      toast.error("يرجى اختيار المركز");
      return;
    }

    if (!formData.parent_name.trim()) {
      toast.error("يرجى إدخال اسم ولي الأمر");
      return;
    }
    if (!formData.parent_phone.trim()) {
      toast.error("يرجى إدخال رقم هاتف ولي الأمر");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-student-with-parent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: formData.full_name,
          studentPhone: formData.phone || null,
          studentBirthDate: formData.birth_date || null,
          halqaId: formData.halqa_id || null,
          centerId,
          parentName: formData.parent_name,
          parentPhone: formData.parent_phone,
          parentWork: formData.parent_work || null,
          relationship: formData.relationship,
        }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);
      
      // Upload photo if selected
      if (studentPhoto && result.studentId) {
        const photoUrl = await uploadPhoto(result.studentId);
        if (photoUrl) {
          await fetch(`${supabaseUrl}/functions/v1/admin-operations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update",
              table: "students",
              data: { 
                photo_url: photoUrl,
                current_residence: formData.current_residence || null,
                notes: formData.notes || null,
              },
              id: result.studentId,
            }),
          });
        }
      }
      
      toast.success("تم إضافة الطالب بنجاح");
      onSuccess(result.credentials);
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
          <h1 className="text-lg font-bold text-foreground">تسجيل طالب جديد</h1>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 pb-32 space-y-6">
        {/* صورة الطالب */}
        <div className="flex flex-col items-center">
          <div 
            className="relative w-24 h-24 rounded-full bg-muted flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-primary/30"
            onClick={() => fileInputRef.current?.click()}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="صورة الطالب" className="w-full h-full object-cover" />
            ) : (
              <div className="bg-amber-100 dark:bg-amber-900/30 w-full h-full flex items-center justify-center">
                <User className="w-12 h-12 text-amber-600" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center">
              <Camera className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">صورة الطالب</p>
          <p className="text-xs text-primary cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            اضغط للتحميل
          </p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        {/* البيانات الشخصية */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <User className="w-4 h-4" />
            <span className="font-semibold">البيانات الشخصية</span>
          </div>
          
          <div className="space-y-2">
            <Label>الاسم الكامل *</Label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="اسم الطالب الرباعي"
              className="text-right"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>العمر</Label>
              <Input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="10"
              />
            </div>
            <div className="space-y-2">
              <Label>مكان الميلاد</Label>
              <Input
                value={formData.birth_place}
                onChange={(e) => setFormData({ ...formData, birth_place: e.target.value })}
                placeholder="المدينة، الدولة"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>تاريخ الميلاد</Label>
            <div className="relative">
              <Input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ولي الأمر والتواصل */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <Phone className="w-4 h-4" />
            <span className="font-semibold">ولي الأمر والتواصل</span>
          </div>

          <div className="space-y-2">
            <Label>اسم ولي الأمر *</Label>
            <Input
              value={formData.parent_name}
              onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
              placeholder="الاسم الثلاثي"
            />
          </div>

          <div className="space-y-2">
            <Label>عمل ولي الأمر</Label>
            <Input
              value={formData.parent_work}
              onChange={(e) => setFormData({ ...formData, parent_work: e.target.value })}
              placeholder="مثال: معلم، مهندس..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>هاتف الطالب</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="05xxxxxxxx"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>هاتف ولي الأمر *</Label>
              <Input
                value={formData.parent_phone}
                onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                placeholder="05xxxxxxxx"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>السكن الحالي</Label>
            <Input
              value={formData.current_residence}
              onChange={(e) => setFormData({ ...formData, current_residence: e.target.value })}
              placeholder="الحي، الشارع"
            />
          </div>
        </div>

        {/* بيانات التحفيظ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-600">
            <BookOpen className="w-4 h-4" />
            <span className="font-semibold">بيانات التحفيظ</span>
          </div>

          <div className="space-y-2">
            <Label>تاريخ الالتحاق</Label>
            <div className="relative">
              <Input
                type="date"
                value={formData.join_date}
                onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {isSuperAdmin && (
            <div className="space-y-2">
              <Label>المركز *</Label>
              <Select value={formData.center_id} onValueChange={(v) => setFormData({ ...formData, center_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المركز..." />
                </SelectTrigger>
                <SelectContent>
                  {centers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>اسم الحلقة</Label>
            <Select value={formData.halqa_id} onValueChange={(v) => setFormData({ ...formData, halqa_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الحلقة..." />
              </SelectTrigger>
              <SelectContent>
                {halaqat.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ملاحظات */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-amber-600">
            <FileText className="w-4 h-4" />
            <span className="font-semibold">ملاحظات</span>
          </div>

          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="أي ملاحظات إضافية عن الطالب..."
            className="min-h-[100px]"
          />
        </div>
      </form>

      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 flex gap-3">
        <Button 
          type="submit" 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 h-12"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "حفظ الطالب"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} className="px-8 h-12">
          إلغاء
        </Button>
      </div>
    </div>
  );
};
