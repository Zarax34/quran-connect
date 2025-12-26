import { useState, useEffect } from "react";
import { UserCog, Plus, Pencil, Trash2, Search, Loader2, Shield } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type AppRole = "super_admin" | "center_admin" | "teacher" | "communication_officer" | "parent" | "student";

interface UserWithRole {
  id: string;
  full_name: string;
  phone: string | null;
  role: AppRole;
  center_id: string | null;
}

interface Center {
  id: string;
  name: string;
}

// Only admin/staff roles - exclude parent and student
const ADMIN_ROLES: AppRole[] = ["super_admin", "center_admin", "teacher", "communication_officer"];

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "مسؤول النظام",
  center_admin: "مدير مركز",
  teacher: "معلم",
  communication_officer: "مسؤول تواصل",
  parent: "ولي أمر",
  student: "طالب",
};

const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: "bg-destructive/10 text-destructive",
  center_admin: "bg-secondary/10 text-secondary",
  teacher: "bg-primary/10 text-primary",
  communication_officer: "bg-info/10 text-info",
  parent: "bg-muted text-muted-foreground",
  student: "bg-muted text-muted-foreground",
};

export const UsersManagement = () => {
  const { isSuperAdmin, selectedCenterId } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    full_name: "",
    role: "" as AppRole | "",
    center_id: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchCenters();
  }, [isSuperAdmin]);

  const fetchUsers = async () => {
    try {
      // First get all user roles - filter out parent and student roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, center_id")
        .in("role", ADMIN_ROLES);

      if (rolesError) throw rolesError;

      if (rolesData && rolesData.length > 0) {
        const userIds = [...new Set(rolesData.map((r) => r.user_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        // Combine profiles with roles
        const usersWithRoles: UserWithRole[] = rolesData.map((role) => {
          const profile = profilesData?.find((p) => p.id === role.user_id);
          return {
            id: role.user_id,
            full_name: profile?.full_name || "غير معروف",
            phone: profile?.phone || null,
            role: role.role as AppRole,
            center_id: role.center_id,
          };
        });

        setUsers(usersWithRoles);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("حدث خطأ في تحميل المستخدمين");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCenters = async () => {
    try {
      const { data, error } = await supabase
        .from("centers")
        .select("id, name")
        .eq("is_active", true);

      if (error) throw error;
      setCenters(data || []);
    } catch (error) {
      console.error("Error fetching centers:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.password || !formData.full_name || !formData.role) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (formData.role !== "super_admin" && !formData.center_id) {
      toast.error("يرجى اختيار المركز");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username || formData.full_name,
          password: formData.password,
          fullName: formData.full_name,
          role: formData.role,
          centerId: formData.role === "super_admin" ? null : formData.center_id,
        }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      toast.success("تم إضافة المستخدم بنجاح");
      setIsDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "حدث خطأ في إضافة المستخدم");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      full_name: "",
      role: "",
      center_id: "",
    });
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.includes(searchQuery) ||
      ROLE_LABELS[u.role].includes(searchQuery)
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
        <h2 className="text-xl font-bold text-foreground">إدارة المستخدمين</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة مستخدم
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة مستخدم جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  الاسم الكامل *
                </label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="أدخل الاسم الكامل"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  اسم المستخدم (اختياري)
                </label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="اسم المستخدم (إذا ترك فارغاً يستخدم الاسم الكامل)"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">إذا ترك فارغاً سيتم استخدام الاسم الكامل كاسم مستخدم</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  كلمة المرور *
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="أدخل كلمة المرور"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  الصلاحية *
                </label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as AppRole })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الصلاحية" />
                  </SelectTrigger>
                  <SelectContent>
                    {ADMIN_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.role && formData.role !== "super_admin" && (
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
          placeholder="ابحث عن مستخدم..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <Card className="p-8 text-center">
          <UserCog className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">
            {users.length === 0 ? "لا يوجد مستخدمين" : "لم يتم العثور على نتائج"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user, index) => (
            <Card key={`${user.id}-${index}`} className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{user.full_name}</h3>
                    <Badge className={ROLE_COLORS[user.role]}>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </div>
                  {user.center_id && (
                    <p className="text-muted-foreground text-sm mt-1">
                      {centers.find((c) => c.id === user.center_id)?.name || "مركز غير معروف"}
                    </p>
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
