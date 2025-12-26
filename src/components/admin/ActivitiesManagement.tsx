import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { Plus, Edit, Trash2, Search, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Activity {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  center_id: string;
  requires_approval: boolean;
  is_active: boolean;
  halaqat?: { id: string; name: string }[];
}

interface Center {
  id: string;
  name: string;
}

interface Halqa {
  id: string;
  name: string;
}

interface Student {
  id: string;
  full_name: string;
}

interface Parent {
  id: string;
  full_name: string;
}

interface Approval {
  id: string;
  activity_id: string;
  student_id: string;
  parent_id: string;
  approved: boolean | null;
  notes: string | null;
  response_date: string | null;
  student?: Student;
  parent?: Parent;
}

export const ActivitiesManagement = () => {
  const { isSuperAdmin, selectedCenterId } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [halaqat, setHalaqat] = useState<Halqa[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [previewActivity, setPreviewActivity] = useState<Activity | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    location: "",
    requires_approval: true,
    center_id: "",
    selectedHalaqat: [] as string[],
  });
  const [approvalForm, setApprovalForm] = useState({ student_id: "", parent_id: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchActivities();
    fetchStudents();
    fetchParents();
    fetchHalaqat();
    if (isSuperAdmin) fetchCenters();
  }, [selectedCenterId, isSuperAdmin]);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      let query = supabase.from("activities").select("*").order("start_date", { ascending: false });

      if (!isSuperAdmin && selectedCenterId) {
        query = query.eq("center_id", selectedCenterId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch activity halaqat
      if (data && data.length > 0) {
        const activityIds = data.map(a => a.id);
        const { data: activityHalaqatData } = await supabase
          .from("activity_halaqat")
          .select("activity_id, halqa_id")
          .in("activity_id", activityIds);

        const { data: halaqatData } = await supabase
          .from("halaqat")
          .select("id, name");

        const activitiesWithHalaqat = data.map(activity => {
          const relatedHalaqatIds = activityHalaqatData
            ?.filter(ah => ah.activity_id === activity.id)
            .map(ah => ah.halqa_id) || [];
          const relatedHalaqat = halaqatData?.filter(h => relatedHalaqatIds.includes(h.id)) || [];
          return { ...activity, halaqat: relatedHalaqat };
        });

        setActivities(activitiesWithHalaqat);
      } else {
        setActivities([]);
      }

      const { data: appData } = await supabase
        .from("activity_approvals")
        .select("*, student:students(id, full_name), parent:parents(id, full_name)");
      setApprovals(appData || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast.error("حدث خطأ أثناء جلب البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCenters = async () => {
    const { data } = await supabase.from("centers").select("id, name").eq("is_active", true);
    setCenters(data || []);
  };

  const fetchHalaqat = async () => {
    let query = supabase.from("halaqat").select("id, name").eq("is_active", true);
    if (!isSuperAdmin && selectedCenterId) query = query.eq("center_id", selectedCenterId);
    const { data } = await query;
    setHalaqat(data || []);
  };

  const fetchStudents = async () => {
    let query = supabase.from("students").select("id, full_name").eq("is_active", true);
    if (!isSuperAdmin && selectedCenterId) query = query.eq("center_id", selectedCenterId);
    const { data } = await query;
    setStudents(data || []);
  };

  const fetchParents = async () => {
    const { data } = await supabase.from("parents").select("id, full_name");
    setParents(data || []);
  };

  const toggleHalqa = (halqaId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedHalaqat: prev.selectedHalaqat.includes(halqaId)
        ? prev.selectedHalaqat.filter(id => id !== halqaId)
        : [...prev.selectedHalaqat, halqaId],
    }));
  };

  const selectAllHalaqat = () => {
    setFormData(prev => ({
      ...prev,
      selectedHalaqat: halaqat.map(h => h.id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.start_date) {
      toast.error("يرجى إدخال البيانات المطلوبة");
      return;
    }

    const centerId = editingActivity?.center_id || formData.center_id || selectedCenterId;
    if (!centerId) {
      toast.error("يرجى اختيار المركز");
      return;
    }

    if (formData.requires_approval && formData.selectedHalaqat.length === 0 && !editingActivity) {
      toast.error("يرجى اختيار حلقة واحدة على الأقل عند طلب الموافقة");
      return;
    }

    setIsSubmitting(true);
    try {
      let activityId = editingActivity?.id;

      if (editingActivity) {
        // Update existing activity
        const response = await supabase.functions.invoke("admin-operations", {
          body: JSON.stringify({
            action: "update",
            table: "activities",
            data: {
              name: formData.name.trim(),
              description: formData.description.trim() || null,
              start_date: formData.start_date,
              end_date: formData.end_date || null,
              location: formData.location.trim() || null,
              requires_approval: formData.requires_approval,
              center_id: centerId,
            },
            id: editingActivity.id,
          }),
        });
        if (response.error) throw response.error;
      } else {
        // Insert new activity
        const { data: newActivity, error: insertError } = await supabase
          .from("activities")
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            location: formData.location.trim() || null,
            requires_approval: formData.requires_approval,
            center_id: centerId,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        activityId = newActivity.id;

        // Insert halaqat relationships (this triggers automatic approval requests)
        if (formData.selectedHalaqat.length > 0 && activityId) {
          const halaqatInserts = formData.selectedHalaqat.map(halqaId => ({
            activity_id: activityId,
            halqa_id: halqaId,
          }));

          const { error: halaqatError } = await supabase
            .from("activity_halaqat")
            .insert(halaqatInserts);

          if (halaqatError) throw halaqatError;
        }
      }

      toast.success(editingActivity ? "تم تحديث النشاط بنجاح" : "تم إضافة النشاط وإرسال طلبات الموافقة تلقائياً");
      setIsDialogOpen(false);
      resetForm();
      fetchActivities();
    } catch (error: any) {
      console.error("Error saving activity:", error);
      toast.error(`حدث خطأ: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity || !approvalForm.student_id || !approvalForm.parent_id) {
      toast.error("يرجى اختيار الطالب وولي الأمر");
      return;
    }

    const exists = approvals.find(
      (a) => a.activity_id === selectedActivity.id && a.student_id === approvalForm.student_id
    );
    if (exists) {
      toast.error("تم طلب الموافقة مسبقاً لهذا الطالب");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke("admin-operations", {
        body: JSON.stringify({
          action: "insert",
          table: "activity_approvals",
          data: {
            activity_id: selectedActivity.id,
            student_id: approvalForm.student_id,
            parent_id: approvalForm.parent_id,
            approved: null,
          },
        }),
      });

      if (response.error) throw response.error;

      toast.success("تم إرسال طلب الموافقة");
      setIsApprovalDialogOpen(false);
      setApprovalForm({ student_id: "", parent_id: "" });
      fetchActivities();
    } catch (error: any) {
      toast.error(`حدث خطأ: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف النشاط؟")) return;
    try {
      const response = await supabase.functions.invoke("admin-operations", {
        body: JSON.stringify({ action: "delete", table: "activities", id }),
      });
      if (response.error) throw response.error;
      toast.success("تم حذف النشاط بنجاح");
      fetchActivities();
    } catch (error: any) {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  };

  const openEditDialog = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      name: activity.name,
      description: activity.description || "",
      start_date: activity.start_date,
      end_date: activity.end_date || "",
      location: activity.location || "",
      requires_approval: activity.requires_approval,
      center_id: activity.center_id,
      selectedHalaqat: activity.halaqat?.map(h => h.id) || [],
    });
    setIsDialogOpen(true);
  };

  const openApprovalDialog = (activity: Activity) => {
    setSelectedActivity(activity);
    setApprovalForm({ student_id: "", parent_id: "" });
    setIsApprovalDialogOpen(true);
  };

  const openPreviewDialog = (activity: Activity) => {
    setPreviewActivity(activity);
    setIsPreviewDialogOpen(true);
  };

  const getPreviewApprovals = () => {
    if (!previewActivity) return [];
    return approvals.filter((a) => a.activity_id === previewActivity.id);
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", start_date: "", end_date: "", location: "", requires_approval: true, center_id: selectedCenterId || "", selectedHalaqat: [] });
    setEditingActivity(null);
  };

  const getActivityApprovals = (activityId: string) => approvals.filter((a) => a.activity_id === activityId);

  const filteredActivities = activities.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getApprovalStatus = (approved: boolean | null) => {
    if (approved === null) return { icon: Clock, color: "text-yellow-500", label: "في الانتظار" };
    if (approved) return { icon: CheckCircle, color: "text-green-500", label: "موافق" };
    return { icon: XCircle, color: "text-destructive", label: "مرفوض" };
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl text-foreground">إدارة الأنشطة</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />إضافة نشاط</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editingActivity ? "تعديل نشاط" : "إضافة نشاط جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSuperAdmin && !editingActivity && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">المركز *</label>
                  <Select value={formData.center_id} onValueChange={(v) => setFormData({ ...formData, center_id: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر المركز" /></SelectTrigger>
                    <SelectContent>
                      {centers.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">اسم النشاط *</label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="أدخل اسم النشاط" className="text-right" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">الوصف</label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="وصف النشاط" className="text-right" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">الموقع</label>
                <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="موقع النشاط" className="text-right" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">تاريخ البداية *</label>
                  <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">تاريخ النهاية</label>
                  <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <label className="text-sm font-medium text-foreground">يتطلب موافقة ولي الأمر</label>
                <Switch checked={formData.requires_approval} onCheckedChange={(v) => setFormData({ ...formData, requires_approval: v })} />
              </div>

              {/* Halaqat Selection - only show for new activities */}
              {!editingActivity && formData.requires_approval && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-foreground">الحلقات المشاركة *</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={selectAllHalaqat}>
                      تحديد الكل
                    </Button>
                  </div>
                  <div className="border border-border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                    {halaqat.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center">لا توجد حلقات متاحة</p>
                    ) : (
                      halaqat.map((halqa) => (
                        <div key={halqa.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`halqa-${halqa.id}`}
                            checked={formData.selectedHalaqat.includes(halqa.id)}
                            onCheckedChange={() => toggleHalqa(halqa.id)}
                          />
                          <Label htmlFor={`halqa-${halqa.id}`} className="font-normal cursor-pointer">
                            {halqa.name}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                  {formData.selectedHalaqat.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      تم اختيار {formData.selectedHalaqat.length} حلقة - سيتم إرسال طلبات الموافقة تلقائياً لأولياء الأمور
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">{isSubmitting ? "جاري الحفظ..." : editingActivity ? "تحديث" : "إضافة"}</Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">إلغاء</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10 text-right" />
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">لا توجد أنشطة</div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">النشاط</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الموافقات</TableHead>
                  <TableHead className="text-center w-[120px]">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.map((activity) => {
                  const actApprovals = getActivityApprovals(activity.id);
                  const approved = actApprovals.filter((a) => a.approved === true).length;
                  const pending = actApprovals.filter((a) => a.approved === null).length;
                  return (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{activity.name}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {activity.location && <span className="text-xs text-muted-foreground">{activity.location}</span>}
                          {activity.requires_approval && <Badge variant="outline" className="text-xs">يتطلب موافقة</Badge>}
                          {activity.halaqat && activity.halaqat.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {activity.halaqat.map(h => (
                                <span key={h.id} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  {h.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(activity.start_date), "d MMM yyyy", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        {activity.requires_approval && actApprovals.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-green-600">{approved} موافق</Badge>
                            {pending > 0 && <Badge variant="outline" className="text-yellow-600">{pending} معلق</Badge>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {activity.requires_approval && actApprovals.length > 0 && (
                            <Button variant="ghost" size="icon" onClick={() => openPreviewDialog(activity)} title="معاينة">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(activity)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(activity.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="text-foreground">طلب موافقة على {selectedActivity?.name}</DialogTitle></DialogHeader>
            <form onSubmit={handleRequestApproval} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">الطالب *</label>
                <Select value={approvalForm.student_id} onValueChange={(v) => setApprovalForm({ ...approvalForm, student_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                  <SelectContent>{students.map((s) => (<SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">ولي الأمر *</label>
                <Select value={approvalForm.parent_id} onValueChange={(v) => setApprovalForm({ ...approvalForm, parent_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر ولي الأمر" /></SelectTrigger>
                  <SelectContent>{parents.map((p) => (<SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">{isSubmitting ? "جاري الإرسال..." : "إرسال الطلب"}</Button>
                <Button type="button" variant="outline" onClick={() => setIsApprovalDialogOpen(false)} className="flex-1">إلغاء</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">معاينة الموافقات - {previewActivity?.name}</DialogTitle>
            </DialogHeader>
            
            {(() => {
              const previewApprovals = getPreviewApprovals();
              const approvedCount = previewApprovals.filter((a) => a.approved === true).length;
              const rejectedCount = previewApprovals.filter((a) => a.approved === false).length;
              const pendingCount = previewApprovals.filter((a) => a.approved === null).length;

              return (
                <div className="space-y-4 mt-4">
                  {/* Summary */}
                  <div className="flex gap-3 justify-center flex-wrap">
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-lg text-center">
                      <div className="text-2xl font-bold">{approvedCount}</div>
                      <div className="text-sm">موافق</div>
                    </div>
                    <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg text-center">
                      <div className="text-2xl font-bold">{rejectedCount}</div>
                      <div className="text-sm">مرفوض</div>
                    </div>
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-4 py-2 rounded-lg text-center">
                      <div className="text-2xl font-bold">{pendingCount}</div>
                      <div className="text-sm">في الانتظار</div>
                    </div>
                  </div>

                  {previewApprovals.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      لا توجد طلبات موافقة لهذا النشاط
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">اسم الطالب</TableHead>
                          <TableHead className="text-right">ولي الأمر</TableHead>
                          <TableHead className="text-center">حالة الموافقة</TableHead>
                          <TableHead className="text-right">تاريخ الرد</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewApprovals.map((approval) => {
                          const status = getApprovalStatus(approval.approved);
                          const StatusIcon = status.icon;
                          return (
                            <TableRow key={approval.id}>
                              <TableCell className="font-medium">
                                {approval.student?.full_name || "-"}
                              </TableCell>
                              <TableCell>{approval.parent?.full_name || "-"}</TableCell>
                              <TableCell className="text-center">
                                <span className={`inline-flex items-center gap-1 ${status.color}`}>
                                  <StatusIcon className="w-4 h-4" />
                                  {status.label}
                                </span>
                              </TableCell>
                              <TableCell>
                                {approval.response_date
                                  ? format(new Date(approval.response_date), "d MMM yyyy", { locale: ar })
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
