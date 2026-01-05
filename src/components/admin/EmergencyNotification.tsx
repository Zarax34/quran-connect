import { useState, useEffect } from "react";
import { AlertTriangle, Send, Loader2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Halqa {
  id: string;
  name: string;
}

type TargetRole = "teacher" | "parent" | "student" | "all";

export const EmergencyNotification = () => {
  const { isSuperAdmin, selectedCenterId } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [halaqat, setHalaqat] = useState<Halqa[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    targetRole: "all" as TargetRole,
    selectedHalqaId: "",
    isEmergency: true,
  });

  useEffect(() => {
    if (isDialogOpen && selectedCenterId) {
      fetchHalaqat();
    }
  }, [isDialogOpen, selectedCenterId]);

  const fetchHalaqat = async () => {
    try {
      const { data, error } = await supabase
        .from("halaqat")
        .select("id, name")
        .eq("center_id", selectedCenterId)
        .eq("is_active", true);

      if (error) throw error;
      setHalaqat(data || []);
    } catch (error) {
      console.error("Error fetching halaqat:", error);
    }
  };

  const getUserIds = async (): Promise<string[]> => {
    const userIds: string[] = [];

    try {
      if (formData.targetRole === "all" || formData.targetRole === "teacher") {
        // Get teachers
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "teacher")
          .eq("center_id", selectedCenterId);
        
        if (roles) {
          userIds.push(...roles.map(r => r.user_id));
        }
      }

      if (formData.targetRole === "all" || formData.targetRole === "parent") {
        // Get parents of students in the center
        let query = supabase
          .from("students")
          .select("id")
          .eq("center_id", selectedCenterId)
          .eq("is_active", true);

        if (formData.selectedHalqaId) {
          query = query.eq("halqa_id", formData.selectedHalqaId);
        }

        const { data: students } = await query;

        if (students && students.length > 0) {
          const studentIds = students.map(s => s.id);
          
          const { data: parentLinks } = await supabase
            .from("student_parents")
            .select("parent_id")
            .in("student_id", studentIds);

          if (parentLinks) {
            const parentIds = [...new Set(parentLinks.map(p => p.parent_id))];
            
            const { data: parents } = await supabase
              .from("parents")
              .select("user_id")
              .in("id", parentIds)
              .not("user_id", "is", null);

            if (parents) {
              userIds.push(...parents.map(p => p.user_id!));
            }
          }
        }
      }

      if (formData.targetRole === "all" || formData.targetRole === "student") {
        // Get students
        let query = supabase
          .from("students")
          .select("user_id")
          .eq("center_id", selectedCenterId)
          .eq("is_active", true)
          .not("user_id", "is", null);

        if (formData.selectedHalqaId) {
          query = query.eq("halqa_id", formData.selectedHalqaId);
        }

        const { data: students } = await query;

        if (students) {
          userIds.push(...students.map(s => s.user_id!));
        }
      }
    } catch (error) {
      console.error("Error getting user IDs:", error);
    }

    return [...new Set(userIds)]; // Remove duplicates
  };

  const handleSend = async () => {
    if (!formData.title.trim() || !formData.body.trim()) {
      toast.error("يرجى ملء العنوان والمحتوى");
      return;
    }

    setIsLoading(true);

    try {
      const userIds = await getUserIds();

      if (userIds.length === 0) {
        toast.error("لا يوجد مستخدمين لإرسال الإشعار إليهم");
        setIsLoading(false);
        return;
      }

      // Send push notification
      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          user_ids: userIds,
          title: formData.title,
          body: formData.body,
          priority: formData.isEmergency ? "emergency" : "normal",
          data: {
            type: formData.isEmergency ? "emergency" : "announcement",
          },
        },
      });

      if (error) throw error;

      // Also create in-app notifications
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title: formData.isEmergency ? `🚨 ${formData.title}` : formData.title,
        content: formData.body,
        type: formData.isEmergency ? "emergency" : "announcement",
        is_read: false,
      }));

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      await fetch(`${supabaseUrl}/functions/v1/admin-operations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "insert_many",
          table: "notifications",
          data: notifications,
        }),
      });

      toast.success(`تم إرسال الإشعار إلى ${userIds.length} مستخدم`);
      setIsDialogOpen(false);
      setFormData({
        title: "",
        body: "",
        targetRole: "all",
        selectedHalqaId: "",
        isEmergency: true,
      });
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast.error(error.message || "حدث خطأ في إرسال الإشعار");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-destructive/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">إشعار طارئ</h3>
              <p className="text-sm text-muted-foreground">
                إرسال إشعار عاجل بصوت تنبيه قوي
              </p>
            </div>
          </div>
        </Card>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            إرسال إشعار طارئ
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              العنوان *
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="عنوان الإشعار"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              المحتوى *
            </label>
            <Textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="محتوى الإشعار"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              الفئة المستهدفة
            </label>
            <Select
              value={formData.targetRole}
              onValueChange={(value) => setFormData({ ...formData, targetRole: value as TargetRole })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الجميع</SelectItem>
                <SelectItem value="teacher">المعلمين فقط</SelectItem>
                <SelectItem value="parent">أولياء الأمور فقط</SelectItem>
                <SelectItem value="student">الطلاب فقط</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(formData.targetRole === "parent" || formData.targetRole === "student" || formData.targetRole === "all") && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                الحلقة (اختياري)
              </label>
              <Select
                value={formData.selectedHalqaId || "all"}
                onValueChange={(value) => setFormData({ ...formData, selectedHalqaId: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="جميع الحلقات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحلقات</SelectItem>
                  {halaqat.map((halqa) => (
                    <SelectItem key={halqa.id} value={halqa.id}>
                      {halqa.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox
              id="isEmergency"
              checked={formData.isEmergency}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, isEmergency: checked as boolean })
              }
            />
            <label htmlFor="isEmergency" className="text-sm font-medium cursor-pointer">
              إشعار طارئ (صوت تنبيه قوي)
            </label>
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSend}
              disabled={isLoading}
              className={formData.isEmergency ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 ml-2" />
                  إرسال
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
