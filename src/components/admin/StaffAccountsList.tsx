import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, UserCog, Power, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface StaffAccount {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  role: 'teacher' | 'communication_officer';
  center_name: string | null;
  is_active: boolean;
}

interface Halqa {
  id: string;
  name: string;
  teacher_id: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  teacher: "معلم",
  communication_officer: "مسؤول تواصل",
};

const ROLE_COLORS: Record<string, string> = {
  teacher: "bg-secondary text-secondary-foreground",
  communication_officer: "bg-primary text-primary-foreground",
};

export const StaffAccountsList = () => {
  const { selectedCenterId, isSuperAdmin } = useAuth();
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [halaqat, setHalaqat] = useState<Halqa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    password: "",
    role: "teacher" as "teacher" | "communication_officer",
    halqaId: "" as string,
  });

  useEffect(() => {
    fetchStaff();
    fetchHalaqat();
  }, [selectedCenterId, isSuperAdmin]);

  const fetchHalaqat = async () => {
    if (!selectedCenterId) return;
    
    try {
      const { data, error } = await supabase
        .from("halaqat")
        .select("id, name, teacher_id")
        .eq("center_id", selectedCenterId)
        .eq("is_active", true);

      if (error) throw error;
      setHalaqat(data || []);
    } catch (error) {
      console.error("Error fetching halaqat:", error);
    }
  };

  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      
      // Get staff roles (teachers and communication officers)
      let query = supabase
        .from("user_roles")
        .select(`
          id,
          user_id,
          role,
          center_id,
          centers:center_id (name)
        `)
        .in("role", ["teacher", "communication_officer"]);

      // Filter by center for center admins
      if (!isSuperAdmin && selectedCenterId) {
        query = query.eq("center_id", selectedCenterId);
      }

      const { data: rolesData, error: rolesError } = await query;
      
      if (rolesError) throw rolesError;

      if (!rolesData || rolesData.length === 0) {
        setStaff([]);
        return;
      }

      // Get profiles for these users
      const userIds = [...new Set(rolesData.map(r => r.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const staffList: StaffAccount[] = [];
      
      for (const role of rolesData) {
        const profile = profilesData?.find(p => p.id === role.user_id);
        if (profile) {
          staffList.push({
            id: role.id,
            user_id: role.user_id,
            full_name: profile.full_name,
            email: profile.email,
            role: role.role as 'teacher' | 'communication_officer',
            center_name: (role.centers as any)?.name || null,
            is_active: true,
          });
        }
      }

      setStaff(staffList);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast.error("حدث خطأ في جلب بيانات الموظفين");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName.trim() || !formData.username.trim() || !formData.password.trim()) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (!selectedCenterId) {
      toast.error("يرجى اختيار مركز أولاً");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          username: formData.username.trim(),
          password: formData.password,
          fullName: formData.fullName.trim(),
          role: formData.role,
          centerId: selectedCenterId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // If teacher and halqa selected, assign the halqa to this teacher
      if (formData.role === "teacher" && formData.halqaId && data?.userId) {
        const { error: halqaError } = await supabase
          .from("halaqat")
          .update({ teacher_id: data.userId })
          .eq("id", formData.halqaId);

        if (halqaError) {
          console.error("Error assigning halqa:", halqaError);
          toast.warning("تم إنشاء الحساب لكن فشل تعيين الحلقة");
        }
      }

      toast.success("تم إنشاء الحساب بنجاح");
      setIsDialogOpen(false);
      setFormData({ fullName: "", username: "", password: "", role: "teacher", halqaId: "" });
      fetchStaff();
      fetchHalaqat();
    } catch (error: any) {
      console.error("Error creating staff:", error);
      toast.error(error.message || "حدث خطأ في إنشاء الحساب");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ fullName: "", username: "", password: "", role: "teacher", halqaId: "" });
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setTogglingUserId(userId);
      
      const { error } = await supabase.functions.invoke("toggle-user-status", {
        body: { userId, disable: currentStatus },
      });

      if (error) throw error;

      setStaff(prev => 
        prev.map(s => 
          s.user_id === userId 
            ? { ...s, is_active: !currentStatus }
            : s
        )
      );
      
      toast.success(currentStatus ? "تم تعطيل الحساب" : "تم تفعيل الحساب");
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast.error("حدث خطأ في تغيير حالة الحساب");
    } finally {
      setTogglingUserId(null);
    }
  };

  const filteredStaff = staff.filter(s => 
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="البحث عن موظف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة موظف
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة معلم أو مسؤول تواصل</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">الاسم الكامل *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="أدخل الاسم الكامل"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">اسم المستخدم *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="أدخل اسم المستخدم"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
                  required
                  minLength={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">الدور *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "teacher" | "communication_officer") => 
                    setFormData({ ...formData, role: value, halqaId: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">معلم</SelectItem>
                    <SelectItem value="communication_officer">مسؤول تواصل</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.role === "teacher" && (
                <div className="space-y-2">
                  <Label htmlFor="halqa">الحلقة (اختياري)</Label>
                  <Select
                    value={formData.halqaId}
                    onValueChange={(value) => setFormData({ ...formData, halqaId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">بدون حلقة</SelectItem>
                      {halaqat
                        .filter(h => !h.teacher_id)
                        .map((halqa) => (
                          <SelectItem key={halqa.id} value={halqa.id}>
                            {halqa.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {halaqat.filter(h => !h.teacher_id).length === 0 && (
                    <p className="text-xs text-muted-foreground">لا توجد حلقات متاحة بدون معلم</p>
                  )}
                </div>
              )}
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    جاري الإنشاء...
                  </>
                ) : (
                  "إنشاء الحساب"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {filteredStaff.length === 0 ? (
        <Card className="p-8 text-center">
          <UserCog className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">
            {searchQuery ? "لا توجد نتائج للبحث" : "لا يوجد معلمين أو مسؤولي تواصل"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredStaff.map((member) => (
            <Card key={member.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCog className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{member.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{member.email || "بدون بريد"}</p>
                    {member.center_name && (
                      <p className="text-xs text-muted-foreground">{member.center_name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={ROLE_COLORS[member.role]}>
                    {ROLE_LABELS[member.role]}
                  </Badge>
                  {isSuperAdmin && (
                    <Button
                      size="icon"
                      variant={member.is_active ? "outline" : "destructive"}
                      onClick={() => toggleUserStatus(member.user_id, member.is_active)}
                      disabled={togglingUserId === member.user_id}
                    >
                      {togglingUserId === member.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
