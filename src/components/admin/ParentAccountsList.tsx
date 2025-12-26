import { useState, useEffect } from "react";
import { Users, Search, Loader2, Key, User, Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ParentAccount {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  has_account: boolean;
  children_names: string[];
  is_active: boolean;
}

export const ParentAccountsList = () => {
  const [parents, setParents] = useState<ParentAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchParentAccounts();
  }, []);

  const fetchParentAccounts = async () => {
    try {
      // Fetch parents with user accounts
      const { data: parentsData, error: parentsError } = await supabase
        .from("parents")
        .select("id, full_name, phone, user_id")
        .not("user_id", "is", null);

      if (parentsError) throw parentsError;

      if (!parentsData || parentsData.length === 0) {
        setParents([]);
        setIsLoading(false);
        return;
      }

      // Get children for each parent
      const parentIds = parentsData.map(p => p.id);
      
      const { data: studentParentsData } = await supabase
        .from("student_parents")
        .select(`
          parent_id,
          students:student_id (full_name)
        `)
        .in("parent_id", parentIds);

      // Map parents with their children (default to active since we can't check auth status from client)
      const parentAccounts: ParentAccount[] = parentsData.map(parent => {
        const childrenData = studentParentsData?.filter(sp => sp.parent_id === parent.id) || [];
        const childrenNames = childrenData.map(c => (c.students as any)?.full_name).filter(Boolean);
        
        return {
          id: parent.id,
          user_id: parent.user_id!,
          full_name: parent.full_name,
          phone: parent.phone,
          has_account: !!parent.user_id,
          children_names: childrenNames,
          is_active: true, // Default to active, will track locally
        };
      });

      setParents(parentAccounts);
    } catch (error) {
      console.error("Error fetching parent accounts:", error);
      toast.error("حدث خطأ في تحميل حسابات أولياء الأمور");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAccountStatus = async (parent: ParentAccount) => {
    setTogglingId(parent.id);
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const action = parent.is_active ? "disable" : "enable";
      
      const response = await fetch(`${supabaseUrl}/functions/v1/toggle-user-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: parent.user_id,
          action,
        }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      // Update local state
      setParents(prev => prev.map(p => 
        p.id === parent.id ? { ...p, is_active: !p.is_active } : p
      ));

      toast.success(parent.is_active ? "تم تعطيل الحساب" : "تم تفعيل الحساب");
    } catch (error: any) {
      console.error("Error toggling account:", error);
      toast.error(error.message || "حدث خطأ في تغيير حالة الحساب");
    } finally {
      setTogglingId(null);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("تم النسخ");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("فشل النسخ");
    }
  };

  const filteredParents = parents.filter(
    (p) =>
      p.full_name.includes(searchQuery) ||
      p.phone.includes(searchQuery) ||
      p.children_names.some(name => name.includes(searchQuery))
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
        <h2 className="text-xl font-bold text-foreground">حسابات أولياء الأمور</h2>
        <Badge variant="secondary" className="text-sm">
          {parents.length} حساب
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="ابحث عن ولي أمر..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Key className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">معلومات تسجيل الدخول</p>
            <p>اسم المستخدم: اسم ولي الأمر الكامل</p>
            <p>كلمة المرور: رقم هاتف ولي الأمر</p>
          </div>
        </div>
      </Card>

      {filteredParents.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">
            {parents.length === 0 ? "لا توجد حسابات أولياء أمور" : "لم يتم العثور على نتائج"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredParents.map((parent) => (
            <Card key={parent.id} className={`p-4 ${!parent.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-secondary" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{parent.full_name}</h3>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={parent.is_active ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}
                      >
                        {parent.is_active ? "مفعّل" : "معطّل"}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {togglingId === parent.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Switch
                            checked={parent.is_active}
                            onCheckedChange={() => toggleAccountStatus(parent)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {parent.children_names.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      الأبناء: {parent.children_names.join("، ")}
                    </p>
                  )}

                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">اسم المستخدم:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-foreground">
                          {parent.full_name}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(parent.full_name, `${parent.id}-name`)}
                        >
                          {copiedId === `${parent.id}-name` ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">كلمة المرور:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-foreground" dir="ltr">
                          {parent.phone}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(parent.phone, `${parent.id}-pass`)}
                        >
                          {copiedId === `${parent.id}-pass` ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
