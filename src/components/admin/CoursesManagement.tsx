import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { AddCourseForm } from "@/components/forms/AddCourseForm";

interface Course {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  center_id: string;
  supervisor_id: string | null;
  max_participants: number | null;
  is_active: boolean;
  created_at: string;
}

interface Center {
  id: string;
  name: string;
}

interface Student {
  id: string;
  full_name: string;
}

interface Registration {
  id: string;
  course_id: string;
  student_id: string;
  status: string;
  student?: Student;
}

export const CoursesManagement = () => {
  const { isSuperAdmin, selectedCenterId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRegDialogOpen, setIsRegDialogOpen] = useState(false);
  const [showAddCourseForm, setShowAddCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    max_participants: "",
    center_id: "",
  });
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCourses();
    fetchStudents();
    if (isSuperAdmin) fetchCenters();
  }, [selectedCenterId, isSuperAdmin]);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      let query = supabase.from("courses").select("*").order("start_date", { ascending: false });

      if (!isSuperAdmin && selectedCenterId) {
        query = query.eq("center_id", selectedCenterId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCourses(data || []);

      // Fetch registrations
      const { data: regData } = await supabase
        .from("course_registrations")
        .select("*, student:students(id, full_name)");
      setRegistrations(regData || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("حدث خطأ أثناء جلب البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCenters = async () => {
    const { data } = await supabase.from("centers").select("id, name").eq("is_active", true);
    setCenters(data || []);
  };

  const fetchStudents = async () => {
    let query = supabase.from("students").select("id, full_name").eq("is_active", true);
    if (!isSuperAdmin && selectedCenterId) {
      query = query.eq("center_id", selectedCenterId);
    }
    const { data } = await query;
    setStudents(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.start_date || !formData.end_date) {
      toast.error("يرجى إدخال البيانات المطلوبة");
      return;
    }

    const centerId = editingCourse?.center_id || formData.center_id || selectedCenterId;
    if (!centerId) {
      toast.error("يرجى اختيار المركز");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke("admin-operations", {
        body: JSON.stringify({
          action: editingCourse ? "update" : "insert",
          table: "courses",
          data: {
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            start_date: formData.start_date,
            end_date: formData.end_date,
            max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
            center_id: centerId,
          },
          id: editingCourse?.id,
        }),
      });

      if (response.error) throw response.error;

      toast.success(editingCourse ? "تم تحديث الدورة بنجاح" : "تم إضافة الدورة بنجاح");
      setIsDialogOpen(false);
      resetForm();
      fetchCourses();
    } catch (error: any) {
      console.error("Error saving course:", error);
      toast.error(`حدث خطأ: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !selectedStudentId) {
      toast.error("يرجى اختيار الطالب");
      return;
    }

    const exists = registrations.find(
      (r) => r.course_id === selectedCourse.id && r.student_id === selectedStudentId
    );
    if (exists) {
      toast.error("الطالب مسجل بالفعل في هذه الدورة");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke("admin-operations", {
        body: JSON.stringify({
          action: "insert",
          table: "course_registrations",
          data: {
            course_id: selectedCourse.id,
            student_id: selectedStudentId,
            status: "registered",
          },
        }),
      });

      if (response.error) throw response.error;

      toast.success("تم تسجيل الطالب بنجاح");
      setIsRegDialogOpen(false);
      setSelectedStudentId("");
      fetchCourses();
    } catch (error: any) {
      toast.error(`حدث خطأ: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف الدورة؟")) return;
    try {
      const response = await supabase.functions.invoke("admin-operations", {
        body: JSON.stringify({ action: "delete", table: "courses", id }),
      });
      if (response.error) throw response.error;
      toast.success("تم حذف الدورة بنجاح");
      fetchCourses();
    } catch (error: any) {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  };

  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      description: course.description || "",
      start_date: course.start_date,
      end_date: course.end_date,
      max_participants: course.max_participants?.toString() || "",
      center_id: course.center_id,
    });
    setIsDialogOpen(true);
  };

  const openRegDialog = (course: Course) => {
    setSelectedCourse(course);
    setSelectedStudentId("");
    setIsRegDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", start_date: "", end_date: "", max_participants: "", center_id: selectedCenterId || "" });
    setEditingCourse(null);
  };

  const getCourseRegistrations = (courseId: string) => registrations.filter((r) => r.course_id === courseId);

  const filteredCourses = courses.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Show full screen add form
  if (showAddCourseForm) {
    return (
      <AddCourseForm 
        onClose={() => setShowAddCourseForm(false)} 
        onSuccess={() => {
          setShowAddCourseForm(false);
          fetchCourses();
        }} 
      />
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl text-foreground">إدارة الدورات</CardTitle>
        <Button className="gap-2" onClick={() => setShowAddCourseForm(true)}>
          <Plus className="h-4 w-4" />إضافة دورة
        </Button>
      </CardHeader>
      
      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">تعديل دورة</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">اسم الدورة *</label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="أدخل اسم الدورة" className="text-right" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">الوصف</label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="وصف الدورة" className="text-right" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">تاريخ البداية *</label>
                <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">تاريخ النهاية *</label>
                <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">الحد الأقصى للمشاركين</label>
              <Input type="number" value={formData.max_participants} onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })} placeholder="اختياري" />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1">{isSubmitting ? "جاري الحفظ..." : "تحديث"}</Button>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">إلغاء</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10 text-right" />
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">لا توجد دورات</div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">الدورة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">المسجلين</TableHead>
                  <TableHead className="text-center w-[120px]">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((course) => {
                  const regs = getCourseRegistrations(course.id);
                  return (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{course.name}</div>
                        {course.description && <div className="text-xs text-muted-foreground">{course.description}</div>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(course.start_date), "d MMM", { locale: ar })} - {format(new Date(course.end_date), "d MMM yyyy", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{regs.length}{course.max_participants ? `/${course.max_participants}` : ""}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openRegDialog(course)} title="تسجيل طالب"><Users className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(course)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(course.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isRegDialogOpen} onOpenChange={setIsRegDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="text-foreground">تسجيل طالب في {selectedCourse?.name}</DialogTitle></DialogHeader>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">الطالب *</label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                  <SelectContent>{students.map((s) => (<SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">{isSubmitting ? "جاري التسجيل..." : "تسجيل"}</Button>
                <Button type="button" variant="outline" onClick={() => setIsRegDialogOpen(false)} className="flex-1">إلغاء</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
