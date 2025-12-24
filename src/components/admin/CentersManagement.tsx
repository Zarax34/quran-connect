import { useState, useEffect } from "react";
import { Building2, Plus, Pencil, Trash2, MapPin, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Center {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  is_active: boolean;
}

export const CentersManagement = () => {
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    try {
      const { data, error } = await supabase
        .from("centers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCenters(data || []);
    } catch (error) {
      console.error("Error fetching centers:", error);
      toast.error("حدث خطأ في تحميل المراكز");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("يرجى إدخال اسم المركز");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-operations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editingCenter ? "update" : "insert",
          table: "centers",
          data: {
            name: formData.name,
            location: formData.location || null,
            description: formData.description || null,
          },
          id: editingCenter?.id,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      toast.success(editingCenter ? "تم تحديث المركز بنجاح" : "تم إضافة المركز بنجاح");
      setIsDialogOpen(false);
      resetForm();
      fetchCenters();
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
          table: "centers",
          id,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      toast.success("تم حذف المركز بنجاح");
      fetchCenters();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "حدث خطأ في حذف المركز");
    }
  };

  const openEditDialog = (center: Center) => {
    setEditingCenter(center);
    setFormData({
      name: center.name,
      location: center.location || "",
      description: center.description || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", location: "", description: "" });
    setEditingCenter(null);
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
        <h2 className="text-xl font-bold text-foreground">إدارة المراكز</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة مركز
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCenter ? "تعديل المركز" : "إضافة مركز جديد"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  اسم المركز *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="أدخل اسم المركز"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  الموقع
                </label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="أدخل موقع المركز"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  الوصف
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="أدخل وصف المركز"
                  rows={3}
                />
              </div>
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
                  ) : editingCenter ? (
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

      {centers.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">لا توجد مراكز</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {centers.map((center) => (
            <Card key={center.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{center.name}</h3>
                  {center.location && (
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <MapPin className="w-3 h-3" />
                      <span>{center.location}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(center)}
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
                        <AlertDialogTitle>حذف المركز</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف مركز "{center.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(center.id)}
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
    </div>
  );
};
