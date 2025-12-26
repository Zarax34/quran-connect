import { useState, useEffect } from "react";
import { 
  Plus, 
  Loader2, 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Save,
  Eye,
  Edit,
  AlertCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type AttendanceStatus = Database["public"]["Enums"]["attendance_status"];
type RecitationType = Database["public"]["Enums"]["recitation_type"];

interface Halqa {
  id: string;
  name: string;
  center_id: string;
}

interface Student {
  id: string;
  full_name: string;
  halqa_id: string;
}

interface Report {
  id: string;
  halqa_id: string;
  report_date: string;
  status: string;
  halqa?: { name: string };
}

interface ReportEntry {
  id: string;
  student_id: string;
  attendance_status: AttendanceStatus;
  notes: string | null;
  student?: { full_name: string };
}

interface Recitation {
  id: string;
  report_entry_id: string;
  surah: string;
  from_ayah: number;
  to_ayah: number;
  type: RecitationType;
  grade: number | null;
  notes: string | null;
}

interface StudentEntry {
  studentId: string;
  studentName: string;
  attendance: AttendanceStatus;
  notes: string;
  recitations: {
    surah: string;
    fromAyah: number;
    toAyah: number;
    type: RecitationType;
    grade: number;
  }[];
}

const SURAHS = [
  "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال",
  "التوبة", "يونس", "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء",
  "الكهف", "مريم", "طه", "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء",
  "النمل", "القصص", "العنكبوت", "الروم", "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر",
  "يس", "الصافات", "ص", "الزمر", "غافر", "فصلت", "الشورى", "الزخرف", "الدخان",
  "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق", "الذاريات", "الطور", "النجم",
  "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة", "الصف",
  "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة",
  "المعارج", "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات",
  "النبأ", "النازعات", "عبس", "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج",
  "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد", "الشمس", "الليل", "الضحى",
  "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات", "القارعة",
  "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون",
  "النصر", "المسد", "الإخلاص", "الفلق", "الناس"
];

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "present", label: "حاضر", color: "bg-green-500" },
  { value: "absent", label: "غائب", color: "bg-red-500" },
  { value: "absent_with_permission", label: "غائب بإذن", color: "bg-yellow-500" },
  { value: "escaped", label: "هارب", color: "bg-orange-500" },
];

const RECITATION_TYPES: { value: RecitationType; label: string }[] = [
  { value: "new_memorization", label: "حفظ جديد" },
  { value: "review", label: "مراجعة" },
  { value: "recitation", label: "تلاوة" },
  { value: "talqeen", label: "تلقين" },
];

export const DailyReports = () => {
  const { user, isSuperAdmin, selectedCenterId, roles } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [halaqat, setHalaqat] = useState<Halqa[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // New report form
  const [selectedHalqa, setSelectedHalqa] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [studentEntries, setStudentEntries] = useState<StudentEntry[]>([]);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  
  // Edit mode
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // View details
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewEntries, setViewEntries] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const isCommunicationOfficer = roles.some(r => r.role === "communication_officer");
  const isCenterAdmin = roles.some(r => r.role === "center_admin");

  useEffect(() => {
    fetchData();
  }, [selectedCenterId, isSuperAdmin, user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch halaqat based on role
      let halaqatData: Halqa[] = [];
      
      if (isSuperAdmin || isCenterAdmin || isCommunicationOfficer) {
        // Super admin, center admin, and communication officer can see all halaqat
        let halaqatQuery = supabase.from("halaqat").select("*").eq("is_active", true);
        if (!isSuperAdmin && selectedCenterId) {
          halaqatQuery = halaqatQuery.eq("center_id", selectedCenterId);
        }
        const { data } = await halaqatQuery;
        halaqatData = data || [];
      } else {
        // Regular teacher can only see their own halqa
        const { data } = await supabase
          .from("halaqat")
          .select("*")
          .eq("teacher_id", user.id)
          .eq("is_active", true);
        halaqatData = data || [];
      }
      
      setHalaqat(halaqatData);

      // Fetch reports - teachers see only their reports, others see all
      let reportsQuery = supabase
        .from("reports")
        .select("*, halqa:halaqat(name)")
        .order("report_date", { ascending: false })
        .limit(20);
      
      if (!isSuperAdmin && !isCenterAdmin && !isCommunicationOfficer) {
        reportsQuery = reportsQuery.eq("teacher_id", user.id);
      }
      
      const { data: reportsData } = await reportsQuery;
      setReports(reportsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("خطأ في جلب البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHalqaChange = async (halqaId: string) => {
    setSelectedHalqa(halqaId);
    
    // Fetch students for this halqa
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, full_name, halqa_id")
      .eq("halqa_id", halqaId)
      .eq("is_active", true);
    
    setStudents(studentsData || []);
    
    // Initialize student entries
    const entries: StudentEntry[] = (studentsData || []).map(student => ({
      studentId: student.id,
      studentName: student.full_name,
      attendance: "present" as AttendanceStatus,
      notes: "",
      recitations: [],
    }));
    setStudentEntries(entries);
  };

  const updateStudentAttendance = (studentId: string, attendance: AttendanceStatus) => {
    setStudentEntries(prev => 
      prev.map(entry => 
        entry.studentId === studentId ? { ...entry, attendance } : entry
      )
    );
  };

  const updateStudentNotes = (studentId: string, notes: string) => {
    setStudentEntries(prev => 
      prev.map(entry => 
        entry.studentId === studentId ? { ...entry, notes } : entry
      )
    );
  };

  const addRecitation = (studentId: string) => {
    setStudentEntries(prev => 
      prev.map(entry => 
        entry.studentId === studentId 
          ? { 
              ...entry, 
              recitations: [...entry.recitations, {
                surah: "الفاتحة",
                fromAyah: 1,
                toAyah: 7,
                type: "new_memorization" as RecitationType,
                grade: 10,
              }]
            } 
          : entry
      )
    );
  };

  const updateRecitation = (studentId: string, recitationIndex: number, field: string, value: any) => {
    setStudentEntries(prev => 
      prev.map(entry => {
        if (entry.studentId !== studentId) return entry;
        const newRecitations = [...entry.recitations];
        newRecitations[recitationIndex] = { ...newRecitations[recitationIndex], [field]: value };
        return { ...entry, recitations: newRecitations };
      })
    );
  };

  const removeRecitation = (studentId: string, recitationIndex: number) => {
    setStudentEntries(prev => 
      prev.map(entry => {
        if (entry.studentId !== studentId) return entry;
        return { 
          ...entry, 
          recitations: entry.recitations.filter((_, i) => i !== recitationIndex) 
        };
      })
    );
  };

  const toggleStudentExpanded = (studentId: string) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const saveReport = async () => {
    if (!selectedHalqa || !reportDate) {
      toast.error("يرجى اختيار الحلقة والتاريخ");
      return;
    }

    setIsSaving(true);
    try {
      // Create report using edge function
      const { data: reportResult, error: reportError } = await supabase.functions.invoke("admin-operations", {
        body: {
          operation: "insert",
          table: "reports",
          data: {
            halqa_id: selectedHalqa,
            report_date: reportDate,
            teacher_id: user?.id,
            status: "pending",
          },
        },
      });

      if (reportError) throw reportError;
      const reportId = reportResult.data[0].id;

      // Create report entries for each student
      for (const entry of studentEntries) {
        const { data: entryResult, error: entryError } = await supabase.functions.invoke("admin-operations", {
          body: {
            operation: "insert",
            table: "report_entries",
            data: {
              report_id: reportId,
              student_id: entry.studentId,
              attendance_status: entry.attendance,
              notes: entry.notes || null,
            },
          },
        });

        if (entryError) throw entryError;
        const entryId = entryResult.data[0].id;

        // Create recitations for this entry
        for (const recitation of entry.recitations) {
          await supabase.functions.invoke("admin-operations", {
            body: {
              operation: "insert",
              table: "recitations",
              data: {
                report_entry_id: entryId,
                surah: recitation.surah,
                from_ayah: recitation.fromAyah,
                to_ayah: recitation.toAyah,
                type: recitation.type,
                grade: recitation.grade,
              },
            },
          });
        }
      }

      toast.success("تم حفظ التقرير بنجاح");
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving report:", error);
      toast.error("خطأ في حفظ التقرير");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedHalqa("");
    setReportDate(new Date().toISOString().split("T")[0]);
    setStudentEntries([]);
    setExpandedStudents(new Set());
    setEditingReport(null);
  };

  const handleViewReport = async (report: Report) => {
    setViewingReport(report);
    setViewDialogOpen(true);
    setLoadingDetails(true);
    
    try {
      const { data: entries } = await supabase
        .from("report_entries")
        .select("*, student:students(full_name)")
        .eq("report_id", report.id);
      
      if (entries) {
        const entriesWithRecitations = await Promise.all(
          entries.map(async (entry) => {
            const { data: recitations } = await supabase
              .from("recitations")
              .select("surah, from_ayah, to_ayah, type, grade")
              .eq("report_entry_id", entry.id);
            
            return { ...entry, recitations: recitations || [] };
          })
        );
        setViewEntries(entriesWithRecitations);
      }
    } catch (error) {
      console.error("Error fetching report details:", error);
      toast.error("خطأ في جلب تفاصيل التقرير");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleEditReport = async (report: Report) => {
    if (report.status !== "pending" && report.status !== "rejected") {
      toast.error("لا يمكن تعديل التقرير بعد اعتماده");
      return;
    }
    
    setEditingReport(report);
    setSelectedHalqa(report.halqa_id);
    setReportDate(report.report_date);
    setIsEditDialogOpen(true);
    
    // Fetch existing entries
    try {
      const { data: entries } = await supabase
        .from("report_entries")
        .select("*, student:students(full_name)")
        .eq("report_id", report.id);
      
      if (entries) {
        const entriesWithRecitations = await Promise.all(
          entries.map(async (entry) => {
            const { data: recitations } = await supabase
              .from("recitations")
              .select("id, surah, from_ayah, to_ayah, type, grade")
              .eq("report_entry_id", entry.id);
            
            return {
              studentId: entry.student_id,
              studentName: entry.student?.full_name || "",
              attendance: entry.attendance_status as AttendanceStatus,
              notes: entry.notes || "",
              entryId: entry.id,
              recitations: (recitations || []).map(r => ({
                surah: r.surah,
                fromAyah: r.from_ayah,
                toAyah: r.to_ayah,
                type: r.type as RecitationType,
                grade: r.grade || 0,
              })),
            };
          })
        );
        setStudentEntries(entriesWithRecitations);
      }
    } catch (error) {
      console.error("Error loading report for edit:", error);
      toast.error("خطأ في تحميل التقرير للتعديل");
    }
  };

  const saveEditedReport = async () => {
    if (!editingReport) return;
    
    setIsSaving(true);
    try {
      // Update report date if changed
      await supabase.functions.invoke("admin-operations", {
        body: {
          operation: "update",
          table: "reports",
          id: editingReport.id,
          data: {
            report_date: reportDate,
            status: "pending", // Reset to pending after edit
          },
        },
      });

      // Update each entry
      for (const entry of studentEntries) {
        if ((entry as any).entryId) {
          // Update existing entry
          await supabase.functions.invoke("admin-operations", {
            body: {
              operation: "update",
              table: "report_entries",
              id: (entry as any).entryId,
              data: {
                attendance_status: entry.attendance,
                notes: entry.notes || null,
              },
            },
          });

          // Delete old recitations and create new ones
          const { data: oldRecitations } = await supabase
            .from("recitations")
            .select("id")
            .eq("report_entry_id", (entry as any).entryId);
          
          if (oldRecitations) {
            for (const rec of oldRecitations) {
              await supabase.functions.invoke("admin-operations", {
                body: {
                  operation: "delete",
                  table: "recitations",
                  id: rec.id,
                },
              });
            }
          }

          // Create new recitations
          for (const recitation of entry.recitations) {
            await supabase.functions.invoke("admin-operations", {
              body: {
                operation: "insert",
                table: "recitations",
                data: {
                  report_entry_id: (entry as any).entryId,
                  surah: recitation.surah,
                  from_ayah: recitation.fromAyah,
                  to_ayah: recitation.toAyah,
                  type: recitation.type,
                  grade: recitation.grade,
                },
              },
            });
          }
        }
      }

      toast.success("تم تحديث التقرير بنجاح");
      setIsEditDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("خطأ في تحديث التقرير");
    } finally {
      setIsSaving(false);
    }
  };

  const getAttendanceLabel = (status: string) => {
    switch (status) {
      case "present": return "حاضر";
      case "absent": return "غائب";
      case "absent_with_permission": return "غائب بإذن";
      case "escaped": return "هارب";
      default: return status;
    }
  };

  const getRecitationTypeLabel = (type: string) => {
    switch (type) {
      case "new_memorization": return "حفظ جديد";
      case "review": return "مراجعة";
      case "recitation": return "تلاوة";
      case "talqeen": return "تلقين";
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">معتمد</Badge>;
      case "rejected":
        return <Badge variant="destructive">مرفوض</Badge>;
      default:
        return <Badge variant="secondary">قيد المراجعة</Badge>;
    }
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
        <h2 className="text-lg font-semibold">التقارير اليومية</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              تقرير جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إنشاء تقرير يومي جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الحلقة</Label>
                  <Select value={selectedHalqa} onValueChange={handleHalqaChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {halaqat.map((halqa) => (
                        <SelectItem key={halqa.id} value={halqa.id}>
                          {halqa.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>التاريخ</Label>
                  <Input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                  />
                </div>
              </div>

              {studentEntries.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    الطلاب ({studentEntries.length})
                  </h3>
                  
                  {studentEntries.map((entry) => (
                    <Collapsible 
                      key={entry.studentId}
                      open={expandedStudents.has(entry.studentId)}
                      onOpenChange={() => toggleStudentExpanded(entry.studentId)}
                    >
                      <Card className="p-3">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{entry.studentName}</span>
                              <div className="flex gap-1">
                                {ATTENDANCE_OPTIONS.map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateStudentAttendance(entry.studentId, option.value);
                                    }}
                                    className={`px-2 py-1 text-xs rounded-full transition-all ${
                                      entry.attendance === option.value
                                        ? `${option.color} text-white`
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {entry.recitations.length > 0 && (
                                <Badge variant="outline" className="gap-1">
                                  <BookOpen className="w-3 h-3" />
                                  {entry.recitations.length}
                                </Badge>
                              )}
                              {expandedStudents.has(entry.studentId) ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent className="mt-4 space-y-4">
                          <div className="space-y-2">
                            <Label>ملاحظات</Label>
                            <Textarea
                              placeholder="ملاحظات عن الطالب..."
                              value={entry.notes}
                              onChange={(e) => updateStudentNotes(entry.studentId, e.target.value)}
                              className="h-20"
                            />
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label>التسميع</Label>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => addRecitation(entry.studentId)}
                                className="gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                إضافة
                              </Button>
                            </div>
                            
                            {entry.recitations.map((recitation, idx) => (
                              <Card key={idx} className="p-3 bg-muted/50">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                  <Select
                                    value={recitation.surah}
                                    onValueChange={(v) => updateRecitation(entry.studentId, idx, "surah", v)}
                                  >
                                    <SelectTrigger className="text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {SURAHS.map((surah) => (
                                        <SelectItem key={surah} value={surah}>
                                          {surah}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  
                                  <Input
                                    type="number"
                                    placeholder="من آية"
                                    value={recitation.fromAyah}
                                    onChange={(e) => updateRecitation(entry.studentId, idx, "fromAyah", parseInt(e.target.value) || 1)}
                                    className="text-xs"
                                    min={1}
                                  />
                                  
                                  <Input
                                    type="number"
                                    placeholder="إلى آية"
                                    value={recitation.toAyah}
                                    onChange={(e) => updateRecitation(entry.studentId, idx, "toAyah", parseInt(e.target.value) || 1)}
                                    className="text-xs"
                                    min={1}
                                  />
                                  
                                  <Select
                                    value={recitation.type}
                                    onValueChange={(v) => updateRecitation(entry.studentId, idx, "type", v)}
                                  >
                                    <SelectTrigger className="text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {RECITATION_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                          {type.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  
                                  <div className="flex gap-1">
                                    <Input
                                      type="number"
                                      placeholder="الدرجة"
                                      value={recitation.grade}
                                      onChange={(e) => updateRecitation(entry.studentId, idx, "grade", parseInt(e.target.value) || 0)}
                                      className="text-xs"
                                      min={0}
                                      max={10}
                                    />
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="shrink-0 text-destructive hover:text-destructive"
                                      onClick={() => removeRecitation(entry.studentId, idx)}
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              )}

              {selectedHalqa && studentEntries.length === 0 && (
                <Card className="p-6 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>لا يوجد طلاب في هذه الحلقة</p>
                </Card>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button 
                  onClick={saveReport} 
                  disabled={isSaving || !selectedHalqa || studentEntries.length === 0}
                  className="gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ التقرير
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {reports.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-medium text-foreground">لا توجد تقارير</h3>
          <p className="text-sm text-muted-foreground mt-1">
            ابدأ بإنشاء تقرير يومي جديد
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{report.halqa?.name || "حلقة غير معروفة"}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(report.report_date).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                  {getStatusBadge(report.status || "pending")}
                </div>
                
                {report.status === "rejected" && (report as any).review_notes && (
                  <div className="bg-destructive/10 text-destructive p-2 rounded text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>سبب الرفض: {(report as any).review_notes}</span>
                  </div>
                )}
                
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => handleViewReport(report)}
                  >
                    <Eye className="w-4 h-4" />
                    عرض
                  </Button>
                  {(report.status === "pending" || report.status === "rejected") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => handleEditReport(report)}
                    >
                      <Edit className="w-4 h-4" />
                      تعديل
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* View Report Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل التقرير</DialogTitle>
          </DialogHeader>
          {loadingDetails ? (
            <div className="py-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">جاري التحميل...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p><strong>الحلقة:</strong> {viewingReport?.halqa?.name}</p>
                <p><strong>التاريخ:</strong> {viewingReport?.report_date && new Date(viewingReport.report_date).toLocaleDateString("ar-SA")}</p>
                <p><strong>الحالة:</strong> {viewingReport?.status === "approved" ? "معتمد" : viewingReport?.status === "rejected" ? "مرفوض" : "قيد المراجعة"}</p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">الطلاب ({viewEntries.length})</h4>
                {viewEntries.map((entry) => (
                  <Card key={entry.id} className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{entry.student?.full_name}</span>
                        <Badge variant={entry.attendance_status === "present" ? "default" : "secondary"}>
                          {getAttendanceLabel(entry.attendance_status)}
                        </Badge>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground">
                          ملاحظات: {entry.notes}
                        </p>
                      )}
                      {entry.recitations && entry.recitations.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-medium">التسميع:</p>
                          {entry.recitations.map((rec: any, idx: number) => (
                            <div key={idx} className="text-sm bg-muted/50 p-2 rounded flex justify-between">
                              <span>
                                {rec.surah} ({rec.from_ayah} - {rec.to_ayah})
                              </span>
                              <span className="flex gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {getRecitationTypeLabel(rec.type)}
                                </Badge>
                                {rec.grade !== null && (
                                  <Badge className="text-xs">{rec.grade}/10</Badge>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Report Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل التقرير</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الحلقة</Label>
                <Input value={halaqat.find(h => h.id === selectedHalqa)?.name || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                />
              </div>
            </div>

            {studentEntries.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  الطلاب ({studentEntries.length})
                </h3>
                
                {studentEntries.map((entry) => (
                  <Collapsible 
                    key={entry.studentId}
                    open={expandedStudents.has(entry.studentId)}
                    onOpenChange={() => toggleStudentExpanded(entry.studentId)}
                  >
                    <Card className="p-3">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{entry.studentName}</span>
                            <div className="flex gap-1">
                              {ATTENDANCE_OPTIONS.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStudentAttendance(entry.studentId, option.value);
                                  }}
                                  className={`px-2 py-1 text-xs rounded-full transition-all ${
                                    entry.attendance === option.value
                                      ? `${option.color} text-white`
                                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                                  }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {entry.recitations.length > 0 && (
                              <Badge variant="outline" className="gap-1">
                                <BookOpen className="w-3 h-3" />
                                {entry.recitations.length}
                              </Badge>
                            )}
                            {expandedStudents.has(entry.studentId) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="mt-4 space-y-4">
                        <div className="space-y-2">
                          <Label>ملاحظات</Label>
                          <Textarea
                            placeholder="ملاحظات عن الطالب..."
                            value={entry.notes}
                            onChange={(e) => updateStudentNotes(entry.studentId, e.target.value)}
                            className="h-20"
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>التسميع</Label>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => addRecitation(entry.studentId)}
                              className="gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              إضافة
                            </Button>
                          </div>
                          
                          {entry.recitations.map((recitation, idx) => (
                            <Card key={idx} className="p-3 bg-muted/50">
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                <Select
                                  value={recitation.surah}
                                  onValueChange={(v) => updateRecitation(entry.studentId, idx, "surah", v)}
                                >
                                  <SelectTrigger className="text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SURAHS.map((surah) => (
                                      <SelectItem key={surah} value={surah}>
                                        {surah}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                
                                <Input
                                  type="number"
                                  placeholder="من آية"
                                  value={recitation.fromAyah}
                                  onChange={(e) => updateRecitation(entry.studentId, idx, "fromAyah", parseInt(e.target.value) || 1)}
                                  className="text-xs"
                                  min={1}
                                />
                                
                                <Input
                                  type="number"
                                  placeholder="إلى آية"
                                  value={recitation.toAyah}
                                  onChange={(e) => updateRecitation(entry.studentId, idx, "toAyah", parseInt(e.target.value) || 1)}
                                  className="text-xs"
                                  min={1}
                                />
                                
                                <Select
                                  value={recitation.type}
                                  onValueChange={(v) => updateRecitation(entry.studentId, idx, "type", v)}
                                >
                                  <SelectTrigger className="text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {RECITATION_TYPES.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                
                                <div className="flex gap-1">
                                  <Input
                                    type="number"
                                    placeholder="الدرجة"
                                    value={recitation.grade}
                                    onChange={(e) => updateRecitation(entry.studentId, idx, "grade", parseInt(e.target.value) || 0)}
                                    className="text-xs"
                                    min={0}
                                    max={10}
                                  />
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="shrink-0 text-destructive hover:text-destructive"
                                    onClick={() => removeRecitation(entry.studentId, idx)}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
              }}>
                إلغاء
              </Button>
              <Button 
                onClick={saveEditedReport} 
                disabled={isSaving || studentEntries.length === 0}
                className="gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ التعديلات
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
