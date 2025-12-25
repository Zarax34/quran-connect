import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Edit, Trash2, Search, UserPlus, Link2 } from "lucide-react";
import { toast } from "sonner";

interface Parent {
  id: string;
  full_name: string;
  phone: string;
  work: string | null;
  user_id: string | null;
  created_at: string;
}

interface Student {
  id: string;
  full_name: string;
  center_id: string;
}

interface StudentParent {
  id: string;
  student_id: string;
  parent_id: string;
  relationship: string | null;
  student?: Student;
}

export const ParentsManagement = () => {
  const { isSuperAdmin, selectedCenterId } = useAuth();
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentParents, setStudentParents] = useState<StudentParent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [selectedParentForLink, setSelectedParentForLink] = useState<Parent | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    work: "",
  });
  const [linkFormData, setLinkFormData] = useState({
    student_id: "",
    relationship: "أب",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchParents();
    fetchStudents();
  }, [selectedCenterId, isSuperAdmin]);

  const fetchParents = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("parents")
        .select("*")
        .order("full_name");

      if (error) throw error;
      setParents(data || []);

      // Fetch student-parent relationships
      const { data: spData, error: spError } = await supabase
        .from("student_parents")
        .select("*, student:students(id, full_name, center_id)");

      if (spError) throw spError;
      setStudentParents(spData || []);
    } catch (error) {
      console.error("Error fetching parents:", error);
      toast.error("حدث خطأ أثناء جلب البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      let query = supabase
        .from("students")
        .select("id, full_name, center_id")
        .eq("is_active", true)
        .order("full_name");

      if (!isSuperAdmin && selectedCenterId) {
        query = query.eq("center_id", selectedCenterId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.phone.trim()) {
      toast.error("يرجى إدخال الاسم ورقم الهاتف");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke("admin-operations", {
        body: JSON.stringify({
          action: editingParent ? "update" : "insert",
          table: "parents",
          data: {
            full_name: formData.full_name.trim(),
            phone: formData.phone.trim(),
            work: formData.work.trim() || null,
          },
          id: editingParent?.id,
        }),
      });

      if (response.error) throw response.error;

      toast.success(editingParent ? "تم تحديث ولي الأمر بنجاح" : "تم إضافة ولي الأمر بنجاح");
      setIsDialogOpen(false);
      resetForm();
      fetchParents();
    } catch (error: any) {
      console.error("Error saving parent:", error);
      toast.error(`حدث خطأ: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentForLink || !linkFormData.student_id) {
      toast.error("يرجى اختيار الطالب");
      return;
    }

    // Check if already linked
    const existingLink = studentParents.find(
      sp => sp.parent_id === selectedParentForLink.id && sp.student_id === linkFormData.student_id
    );
    if (existingLink) {
      toast.error("هذا الطالب مرتبط بالفعل بولي الأمر");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke("admin-operations", {
        body: JSON.stringify({
          action: "insert",
          table: "student_parents",
          data: {
            parent_id: selectedParentForLink.id,
            student_id: linkFormData.student_id,
            relationship: linkFormData.relationship,
          },
        }),
      });

      if (response.error) throw response.error;

      toast.success("تم ربط الطالب بولي الأمر بنجاح");
      setIsLinkDialogOpen(false);
      setLinkFormData({ student_id: "", relationship: "أب" });
      setSelectedParentForLink(null);
      fetchParents();
    } catch (error: any) {
      console.error("Error linking student:", error);
      toast.error(`حدث خطأ: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlinkStudent = async (linkId: string) => {
    if (!confirm("هل أنت متأكد من إلغاء ربط الطالب؟")) return;

    try {
      const response = await supabase.functions.invoke("admin-operations", {
        body: JSON.stringify({
          action: "delete",
          table: "student_parents",
          id: linkId,
        }),
      });

      if (response.error) throw response.error;

      toast.success("تم إلغاء ربط الطالب بنجاح");
      fetchParents();
    } catch (error: any) {
      console.error("Error unlinking student:", error);
      toast.error(`حدث خطأ: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف ولي الأمر؟")) return;

    try {
      const response = await supabase.functions.invoke("admin-operations", {
        body: JSON.stringify({
          action: "delete",
          table: "parents",
          id,
        }),
      });

      if (response.error) throw response.error;

      toast.success("تم حذف ولي الأمر بنجاح");
      fetchParents();
    } catch (error: any) {
      console.error("Error deleting parent:", error);
      toast.error(`حدث خطأ: ${error.message}`);
    }
  };

  const openEditDialog = (parent: Parent) => {
    setEditingParent(parent);
    setFormData({
      full_name: parent.full_name,
      phone: parent.phone,
      work: parent.work || "",
    });
    setIsDialogOpen(true);
  };

  const openLinkDialog = (parent: Parent) => {
    setSelectedParentForLink(parent);
    setLinkFormData({ student_id: "", relationship: "أب" });
    setIsLinkDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ full_name: "", phone: "", work: "" });
    setEditingParent(null);
  };

  const getParentStudents = (parentId: string) => {
    return studentParents.filter(sp => sp.parent_id === parentId);
  };

  const filteredParents = parents.filter(
    (parent) =>
      parent.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      parent.phone.includes(searchQuery)
  );

  const relationshipOptions = ["أب", "أم", "أخ", "أخت", "جد", "جدة", "عم", "خال", "وصي"];

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl text-foreground">إدارة أولياء الأمور</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة ولي أمر
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingParent ? "تعديل ولي أمر" : "إضافة ولي أمر جديد"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  الاسم الكامل *
                </label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="أدخل اسم ولي الأمر"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  رقم الهاتف *
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="أدخل رقم الهاتف"
                  className="text-right"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  العمل
                </label>
                <Input
                  value={formData.work}
                  onChange={(e) => setFormData({ ...formData, work: e.target.value })}
                  placeholder="أدخل مهنة ولي الأمر"
                  className="text-right"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "جاري الحفظ..." : editingParent ? "تحديث" : "إضافة"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 text-right"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : filteredParents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            لا يوجد أولياء أمور
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">العمل</TableHead>
                  <TableHead className="text-right">الأبناء</TableHead>
                  <TableHead className="text-center w-[150px]">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParents.map((parent) => {
                  const linkedStudents = getParentStudents(parent.id);
                  return (
                    <TableRow key={parent.id}>
                      <TableCell className="font-medium text-foreground">
                        {parent.full_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground" dir="ltr">
                        {parent.phone}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {parent.work || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {linkedStudents.length === 0 ? (
                            <span className="text-muted-foreground text-sm">لا يوجد</span>
                          ) : (
                            linkedStudents.map((sp) => (
                              <Badge 
                                key={sp.id} 
                                variant="secondary" 
                                className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => handleUnlinkStudent(sp.id)}
                                title="انقر لإلغاء الربط"
                              >
                                {sp.student?.full_name} ({sp.relationship})
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openLinkDialog(parent)}
                            title="ربط طالب"
                          >
                            <Link2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(parent)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(parent.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Link Student Dialog */}
        <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                ربط طالب بـ {selectedParentForLink?.full_name}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleLinkStudent} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  الطالب *
                </label>
                <Select
                  value={linkFormData.student_id}
                  onValueChange={(value) => setLinkFormData({ ...linkFormData, student_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الطالب" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  صلة القرابة
                </label>
                <Select
                  value={linkFormData.relationship}
                  onValueChange={(value) => setLinkFormData({ ...linkFormData, relationship: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {relationshipOptions.map((rel) => (
                      <SelectItem key={rel} value={rel}>
                        {rel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "جاري الربط..." : "ربط"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsLinkDialogOpen(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
