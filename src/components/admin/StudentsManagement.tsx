import { useState, useEffect } from "react";
import { Users, Plus, Pencil, Trash2, Search, Loader2, Phone, Calendar, UserPlus, Copy, Check } from "lucide-react";
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

interface Student {
  id: string;
  full_name: string;
  phone: string | null;
  birth_date: string | null;
  is_active: boolean;
  halqa_id: string | null;
  center_id: string;
  halaqat?: { name: string } | null;
}

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

export const StudentsManagement = () => {
  const { isSuperAdmin, selectedCenterId } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [halaqat, setHalaqat] = useState<Halqa[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState<CredentialsInfo | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    birth_date: "",
    halqa_id: "",
    center_id: "",
    // Parent info
    parent_name: "",
    parent_phone: "",
    parent_work: "",
    relationship: "أب",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchHalaqat();
    if (isSuperAdmin) {
      fetchCenters();
    }
  }, [selectedCenterId, isSuperAdmin]);

  const fetchStudents = async () => {
    try {
      let query = supabase
        .from("students")
        .select("*, halaqat(name)")
        .order("created_at", { ascending: false });

      if (!isSuperAdmin && selectedCenterId) {
        query = query.eq("center_id", selectedCenterId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("حدث خطأ في تحميل الطلاب");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHalaqat = async () => {
    try {
      let query = supabase
        .from("halaqat")
        .select("id, name")
        .eq("is_active", true);

      if (!isSuperAdmin && selectedCenterId) {
        query = query.eq("center_id", selectedCenterId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setHalaqat(data || []);
    } catch (error) {
      console.error("Error fetching halaqat:", error);
    }
  };

  const fetchCenters = async () => {
    try {
      const { data, error } = await supabase
        .from("centers")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      setCenters(data || []);
    } catch (error) {
      console.error("Error fetching centers:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      toast.error("يرجى إدخال اسم الطالب");
      return;
    }

    const centerId = editingStudent?.center_id || formData.center_id || selectedCenterId;
    if (!centerId) {
      toast.error("يرجى اختيار المركز");
      return;
    }

    // For new students, require parent info
    if (!editingStudent) {
      if (!formData.parent_name.trim()) {
        toast.error("يرجى إدخال اسم ولي الأمر");
        return;
      }
      if (!formData.parent_phone.trim()) {
        toast.error("يرجى إدخال رقم هاتف ولي الأمر");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      if (editingStudent) {
        // Update existing student
        const response = await fetch(`${supabaseUrl}/functions/v1/admin-operations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            table: "students",
            data: {
              full_name: formData.full_name,
              phone: formData.phone || null,
              birth_date: formData.birth_date || null,
              halqa_id: formData.halqa_id || null,
            },
            id: editingStudent.id,
          }),
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        toast.success("تم تحديث الطالب بنجاح");
      } else {
        // Create new student with parent (auto-create accounts)
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
        
        // Show credentials dialog
        setCredentials(result.credentials);
        setShowCredentials(true);
        toast.success("تم إضافة الطالب وولي الأمر بنجاح");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchStudents();
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
          table: "students",
          id,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      toast.success("تم حذف الطالب بنجاح");
      fetchStudents();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "حدث خطأ في حذف الطالب");
    }
  };

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      full_name: student.full_name,
      phone: student.phone || "",
      birth_date: student.birth_date || "",
      halqa_id: student.halqa_id || "",
      center_id: student.center_id || "",
      parent_name: "",
      parent_phone: "",
      parent_work: "",
      relationship: "أب",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ 
      full_name: "", 
      phone: "", 
      birth_date: "", 
      halqa_id: "", 
      center_id: selectedCenterId || "",
      parent_name: "",
      parent_phone: "",
      parent_work: "",
      relationship: "أب",
    });
    setEditingStudent(null);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.full_name.includes(searchQuery) ||
      (s.phone && s.phone.includes(searchQuery))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-bold text-foreground">إدارة الطلاب</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة طالب
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingStudent ? "تعديل الطالب" : "إضافة طالب جديد"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSuperAdmin && !editingStudent && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    المركز *
                  </label>
                  <Select
                    value={formData.center_id}
                    onValueChange={(value) => setFormData({ ...formData, center_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المركز" />
                    </SelectTrigger>
                    <SelectContent>
                      {centers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Student Info Section */}
              <div className="border-b pb-2">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  معلومات الطالب
                </h3>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  اسم الطالب * (سيكون اسم المستخدم)
                </label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="أدخل اسم الطالب"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  رقم هاتف الطالب (سيكون كلمة المرور)
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="إن لم يكن له رقم، سيستخدم رقم ولي الأمر"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  تاريخ الميلاد
                </label>
                <Input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  الحلقة
                </label>
                <Select
                  value={formData.halqa_id}
                  onValueChange={(value) => setFormData({ ...formData, halqa_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحلقة" />
                  </SelectTrigger>
                  <SelectContent>
                    {halaqat.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parent Info Section - Only for new students */}
              {!editingStudent && (
                <>
                  <div className="border-b pb-2 pt-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      معلومات ولي الأمر (سيتم إنشاء حساب تلقائي)
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      اسم ولي الأمر * (سيكون اسم المستخدم)
                    </label>
                    <Input
                      value={formData.parent_name}
                      onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                      placeholder="أدخل اسم ولي الأمر"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      رقم هاتف ولي الأمر * (سيكون كلمة المرور)
                    </label>
                    <Input
                      value={formData.parent_phone}
                      onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                      placeholder="أدخل رقم الهاتف"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      عمل ولي الأمر
                    </label>
                    <Input
                      value={formData.parent_work}
                      onChange={(e) => setFormData({ ...formData, parent_work: e.target.value })}
                      placeholder="أدخل عمل ولي الأمر"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      صلة القرابة
                    </label>
                    <Select
                      value={formData.relationship}
                      onValueChange={(value) => setFormData({ ...formData, relationship: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر صلة القرابة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="أب">أب</SelectItem>
                        <SelectItem value="أم">أم</SelectItem>
                        <SelectItem value="أخ">أخ</SelectItem>
                        <SelectItem value="عم">عم</SelectItem>
                        <SelectItem value="خال">خال</SelectItem>
                        <SelectItem value="جد">جد</SelectItem>
                        <SelectItem value="أخرى">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="flex gap-2 justify-end pt-4">
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
                  ) : editingStudent ? (
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="ابحث عن طالب..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {filteredStudents.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">
            {students.length === 0 ? "لا يوجد طلاب" : "لم يتم العثور على نتائج"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((student) => (
            <Card key={student.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{student.full_name}</h3>
                    {student.is_active ? (
                      <Badge variant="secondary" className="bg-primary/10 text-primary">نشط</Badge>
                    ) : (
                      <Badge variant="secondary">غير نشط</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground text-sm mt-1">
                    {student.halaqat?.name && (
                      <span>{student.halaqat.name}</span>
                    )}
                    {student.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {student.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(student)}
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
                        <AlertDialogTitle>حذف الطالب</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف الطالب "{student.full_name}"؟ لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(student.id)}
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

      {/* Credentials Dialog */}
      <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              تم إنشاء الحسابات بنجاح
            </DialogTitle>
          </DialogHeader>
          {credentials && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                يرجى حفظ بيانات الدخول التالية:
              </p>
              
              <Card className="p-4 space-y-2">
                <h4 className="font-semibold text-foreground">حساب الطالب</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">اسم المستخدم:</span> {credentials.student.username}</p>
                  <p><span className="text-muted-foreground">كلمة المرور:</span> {credentials.student.password}</p>
                </div>
              </Card>
              
              <Card className="p-4 space-y-2">
                <h4 className="font-semibold text-foreground">حساب ولي الأمر</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">اسم المستخدم:</span> {credentials.parent.username}</p>
                  <p><span className="text-muted-foreground">كلمة المرور:</span> {credentials.parent.password}</p>
                </div>
              </Card>
              
              <Button 
                onClick={() => {
                  const text = `حساب الطالب:\nاسم المستخدم: ${credentials.student.username}\nكلمة المرور: ${credentials.student.password}\n\nحساب ولي الأمر:\nاسم المستخدم: ${credentials.parent.username}\nكلمة المرور: ${credentials.parent.password}`;
                  navigator.clipboard.writeText(text);
                  toast.success("تم نسخ بيانات الدخول");
                }}
                variant="outline"
                className="w-full gap-2"
              >
                <Copy className="w-4 h-4" />
                نسخ بيانات الدخول
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
