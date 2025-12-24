import { useState, useEffect } from "react";
import { BookOpen, Plus, Pencil, Trash2, Users, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  category: string | null;
  max_students: number | null;
  is_active: boolean;
  center_id: string;
  teacher_id: string | null;
  profiles?: { full_name: string } | null;
  students_count?: number;
}

interface Teacher {
  id: string;
  full_name: string;
}

const CATEGORIES = [
  { value: "boys", label: "بنين" },
  { value: "girls", label: "بنات" },
  { value: "men", label: "رجال" },
  { value: "women", label: "نساء" },
];

export const HalaqatManagement = () => {
  const { isSuperAdmin, selectedCenterId } = useAuth();
  const [halaqat, setHalaqat] = useState<Halqa[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHalqa, setEditingHalqa] = useState<Halqa | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    max_students: "20",
    teacher_id: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchHalaqat();
    fetchTeachers();
  }, [selectedCenterId, isSuperAdmin]);

  const fetchHalaqat = async () => {
    try {
      let query = supabase
        .from("halaqat")
        .select("*, profiles!halaqat_teacher_id_fkey(full_name)")
        .order("created_at", { ascending: false });

      if (!isSuperAdmin && selectedCenterId) {
        query = query.eq("center_id", selectedCenterId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get students count for each halqa
      const halaqatWithCount = await Promise.all(
        (data || []).map(async (halqa) => {
          const { count } = await supabase
            .from("students")
            .select("*", { count: "exact", head: true })
            .eq("halqa_id", halqa.id)
            .eq("is_active", true);
          return { ...halqa, students_count: count || 0 };
        })
      );

      setHalaqat(halaqatWithCount);
    } catch (error) {
      console.error("Error fetching halaqat:", error);
      toast.error("حدث خطأ في تحميل الحلقات");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      // Get users with teacher role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");

      if (roleError) throw roleError;

      if (roleData && roleData.length > 0) {
        const userIds = roleData.map((r) => r.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (profilesError) throw profilesError;
        setTeachers(profilesData || []);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("يرجى إدخال اسم الحلقة");
      return;
    }

    if (!selectedCenterId && !isSuperAdmin) {
      toast.error("يرجى اختيار مركز أولاً");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-operations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editingHalqa ? "update" : "insert",
          table: "halaqat",
          data: {
            name: formData.name,
            category: formData.category || null,
            max_students: parseInt(formData.max_students) || 20,
            teacher_id: formData.teacher_id || null,
            center_id: editingHalqa?.center_id || selectedCenterId,
          },
          id: editingHalqa?.id,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      toast.success(editingHalqa ? "تم تحديث الحلقة بنجاح" : "تم إضافة الحلقة بنجاح");
      setIsDialogOpen(false);
      resetForm();
      fetchHalaqat();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "حدث خطأ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-operations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          table: "halaqat",
          id,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      toast.success("تم حذف الحلقة بنجاح");
      fetchHalaqat();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "حدث خطأ في حذف الحلقة");
    }
  };

  const openEditDialog = (halqa: Halqa) => {
    setEditingHalqa(halqa);
    setFormData({
      name: halqa.name,
      category: halqa.category || "",
      max_students: halqa.max_students?.toString() || "20",
      teacher_id: halqa.teacher_id || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", category: "", max_students: "20", teacher_id: "" });
    setEditingHalqa(null);
  };

  const getCategoryLabel = (category: string | null) => {
    return CATEGORIES.find((c) => c.value === category)?.label || category;
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
        <h2 className="text-xl font-bold text-foreground">إدارة الحلقات</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة حلقة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingHalqa ? "تعديل الحلقة" : "إضافة حلقة جديدة"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  اسم الحلقة *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="أدخل اسم الحلقة"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  التصنيف
                </label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  الحد الأقصى للطلاب
                </label>
                <Input
                  type="number"
                  value={formData.max_students}
                  onChange={(e) => setFormData({ ...formData, max_students: e.target.value })}
                  placeholder="20"
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  المعلم
                </label>
                <Select
                  value={formData.teacher_id}
                  onValueChange={(value) => setFormData({ ...formData, teacher_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المعلم" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingHalqa ? (
                    "تحديث"
                  ) : (
                    "إضافة"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {halaqat.length === 0 ? (
        <Card className="p-8 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">لا توجد حلقات</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {halaqat.map((halqa) => (
            <Card key={halqa.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{halqa.name}</h3>
                    {halqa.category && (
                      <Badge variant="secondary">{getCategoryLabel(halqa.category)}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground text-sm mt-1">
                    {halqa.profiles?.full_name && (
                      <span>المعلم: {halqa.profiles.full_name}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {halqa.students_count || 0}/{halqa.max_students || 20}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(halqa)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>حذف الحلقة</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف حلقة "{halqa.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(halqa.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
