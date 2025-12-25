import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { 
  Users, 
  FileText, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock,
  BookOpen,
  GraduationCap,
  AlertCircle,
  Loader2,
  ArrowRight
} from "lucide-react";

interface Student {
  id: string;
  full_name: string;
  halqa_id: string | null;
  halqa?: { name: string };
  center?: { name: string };
  is_active: boolean;
}

interface Report {
  id: string;
  report_date: string;
  status: string;
  halqa?: { name: string };
  entries: {
    id: string;
    attendance_status: string;
    notes: string | null;
    recitations: {
      id: string;
      surah: string;
      from_ayah: number;
      to_ayah: number;
      type: string;
      grade: number | null;
    }[];
  }[];
}

interface Activity {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  requires_approval: boolean;
}

interface ActivityApproval {
  id: string;
  activity_id: string;
  student_id: string;
  approved: boolean | null;
  notes: string | null;
  response_date: string | null;
  activity?: Activity;
  student?: { full_name: string };
}

export const ParentDashboard = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<ActivityApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvalDialog, setApprovalDialog] = useState<ActivityApproval | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchChildren();
      fetchPendingApprovals();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChild) {
      fetchReports(selectedChild.id);
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    try {
      // First get the parent record for this user
      const { data: parentData, error: parentError } = await supabase
        .from("parents")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (parentError || !parentData) {
        console.error("Error fetching parent:", parentError);
        setIsLoading(false);
        return;
      }

      // Get students linked to this parent
      const { data: studentParents, error: spError } = await supabase
        .from("student_parents")
        .select(`
          student_id,
          students (
            id,
            full_name,
            halqa_id,
            is_active,
            halaqat (name),
            centers (name)
          )
        `)
        .eq("parent_id", parentData.id);

      if (spError) throw spError;

      const studentsList = studentParents
        ?.map((sp: any) => ({
          id: sp.students.id,
          full_name: sp.students.full_name,
          halqa_id: sp.students.halqa_id,
          halqa: sp.students.halaqat,
          center: sp.students.centers,
          is_active: sp.students.is_active
        }))
        .filter((s: Student) => s.is_active) || [];

      setChildren(studentsList);
      if (studentsList.length > 0) {
        setSelectedChild(studentsList[0]);
      }
    } catch (error) {
      console.error("Error fetching children:", error);
      toast.error("حدث خطأ في تحميل بيانات الأبناء");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReports = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from("report_entries")
        .select(`
          id,
          attendance_status,
          notes,
          reports (
            id,
            report_date,
            status,
            halaqat (name)
          ),
          recitations (
            id,
            surah,
            from_ayah,
            to_ayah,
            type,
            grade
          )
        `)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;

      // Group by report
      const reportsMap = new Map<string, Report>();
      data?.forEach((entry: any) => {
        const reportId = entry.reports.id;
        if (!reportsMap.has(reportId)) {
          reportsMap.set(reportId, {
            id: reportId,
            report_date: entry.reports.report_date,
            status: entry.reports.status,
            halqa: entry.reports.halaqat,
            entries: []
          });
        }
        reportsMap.get(reportId)?.entries.push({
          id: entry.id,
          attendance_status: entry.attendance_status,
          notes: entry.notes,
          recitations: entry.recitations || []
        });
      });

      setReports(Array.from(reportsMap.values()));
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      // Get parent record
      const { data: parentData, error: parentError } = await supabase
        .from("parents")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (parentError || !parentData) return;

      // Get pending approvals
      const { data, error } = await supabase
        .from("activity_approvals")
        .select(`
          *,
          activities (*),
          students (full_name)
        `)
        .eq("parent_id", parentData.id)
        .is("approved", null);

      if (error) throw error;

      setPendingApprovals(data?.map((a: any) => ({
        ...a,
        activity: a.activities,
        student: a.students
      })) || []);
    } catch (error) {
      console.error("Error fetching approvals:", error);
    }
  };

  const handleApproval = async (approved: boolean) => {
    if (!approvalDialog) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("activity_approvals")
        .update({
          approved,
          notes: approvalNotes || null,
          response_date: new Date().toISOString()
        })
        .eq("id", approvalDialog.id);

      if (error) throw error;

      toast.success(approved ? "تمت الموافقة بنجاح" : "تم رفض الطلب");
      setApprovalDialog(null);
      setApprovalNotes("");
      fetchPendingApprovals();
    } catch (error) {
      console.error("Error updating approval:", error);
      toast.error("حدث خطأ في تحديث الموافقة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAttendanceLabel = (status: string) => {
    const labels: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      present: { text: "حاضر", variant: "default" },
      absent: { text: "غائب", variant: "destructive" },
      absent_with_permission: { text: "غائب بإذن", variant: "secondary" },
      escaped: { text: "هروب", variant: "destructive" }
    };
    return labels[status] || { text: status, variant: "outline" };
  };

  const getRecitationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      new_memorization: "حفظ جديد",
      review: "مراجعة",
      recitation: "تلاوة",
      talqeen: "تلقين"
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">لا يوجد أبناء مسجلين</h3>
        <p className="text-muted-foreground">
          لم يتم ربط أي طالب بحسابك. يرجى التواصل مع إدارة المركز.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Notifications */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">لوحة ولي الأمر</h2>
        <NotificationBell />
      </div>

      {/* Pending Approvals Alert */}
      {pendingApprovals.length > 0 && (
        <Card className="p-4 bg-warning/10 border-warning/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-warning" />
            <div className="flex-1">
              <p className="font-medium">لديك {pendingApprovals.length} طلبات موافقة معلقة</p>
              <p className="text-sm text-muted-foreground">انتقل إلى تبويب الموافقات للرد عليها</p>
            </div>
          </div>
        </Card>
      )}

      {/* Children Selection */}
      {children.length > 1 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            اختر الابن/الابنة
          </h3>
          <div className="flex flex-wrap gap-2">
            {children.map((child) => (
              <Button
                key={child.id}
                variant={selectedChild?.id === child.id ? "default" : "outline"}
                onClick={() => setSelectedChild(child)}
                className="gap-2"
              >
                <GraduationCap className="w-4 h-4" />
                {child.full_name}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Selected Child Info */}
      {selectedChild && (
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{selectedChild.full_name}</h2>
              <p className="text-muted-foreground">
                {selectedChild.halqa?.name || "غير مسجل في حلقة"} 
                {selectedChild.center && ` • ${selectedChild.center.name}`}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="w-4 h-4" />
            التقارير
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-2 relative">
            <CheckCircle className="w-4 h-4" />
            الموافقات
            {pendingApprovals.length > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -left-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {pendingApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          {reports.length === 0 ? (
            <Card className="p-6 text-center">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">لا توجد تقارير متاحة</p>
            </Card>
          ) : (
            reports.map((report) => (
              <Card key={report.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {new Date(report.report_date).toLocaleDateString("ar-SA")}
                    </span>
                  </div>
                  <Badge variant="outline">{report.halqa?.name}</Badge>
                </div>

                {report.entries.map((entry) => (
                  <div key={entry.id} className="border-t pt-3 space-y-2">
                    {/* Attendance */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">الحضور:</span>
                      <Badge variant={getAttendanceLabel(entry.attendance_status).variant}>
                        {getAttendanceLabel(entry.attendance_status).text}
                      </Badge>
                    </div>

                    {/* Recitations */}
                    {entry.recitations.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          المقررات:
                        </span>
                        <div className="grid gap-2">
                          {entry.recitations.map((rec) => (
                            <div key={rec.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-lg text-sm">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {getRecitationTypeLabel(rec.type)}
                                </Badge>
                                <span>
                                  {rec.surah} ({rec.from_ayah} - {rec.to_ayah})
                                </span>
                              </div>
                              {rec.grade !== null && (
                                <span className="font-medium text-primary">{rec.grade}/10</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {entry.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">ملاحظات: </span>
                        {entry.notes}
                      </div>
                    )}
                  </div>
                ))}
              </Card>
            ))
          )}
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <Card className="p-6 text-center">
              <CheckCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">لا توجد طلبات موافقة معلقة</p>
            </Card>
          ) : (
            pendingApprovals.map((approval) => (
              <Card key={approval.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{approval.activity?.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      للطالب: {approval.student?.full_name}
                    </p>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    في انتظار الرد
                  </Badge>
                </div>

                {approval.activity?.description && (
                  <p className="text-sm">{approval.activity.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(approval.activity?.start_date || "").toLocaleDateString("ar-SA")}
                  </span>
                  {approval.activity?.location && (
                    <span>📍 {approval.activity.location}</span>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => setApprovalDialog(approval)}
                  >
                    <CheckCircle className="w-4 h-4" />
                    موافقة
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => {
                      setApprovalDialog(approval);
                      setApprovalNotes("");
                    }}
                  >
                    <XCircle className="w-4 h-4" />
                    رفض
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={!!approvalDialog} onOpenChange={() => setApprovalDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              الرد على طلب الموافقة - {approvalDialog?.activity?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              للطالب: {approvalDialog?.student?.full_name}
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">ملاحظات (اختياري)</label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="أضف ملاحظاتك هنا..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleApproval(false)}
              disabled={isSubmitting}
              className="gap-2"
            >
              <XCircle className="w-4 h-4" />
              رفض
            </Button>
            <Button
              onClick={() => handleApproval(true)}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              موافقة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
