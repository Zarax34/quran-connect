import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Award, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  Gift,
  Settings,
  Image as ImageIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface BadgeSetting {
  id: string;
  name: string;
  description: string | null;
  icon_name: string;
  points_value: number;
  requirements_type: string;
  requirements_value: any;
  is_active: boolean;
}

interface StoreItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  points_cost: number;
  badges_cost: number;
  item_type: string;
  is_active: boolean;
  stock_quantity: number | null;
}

export const BadgesManagement = () => {
  const { selectedCenterId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [badges, setBadges] = useState<BadgeSetting[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStoreDialogOpen, setIsStoreDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeSetting | null>(null);
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // نموذج الشارة
  const [badgeForm, setBadgeForm] = useState({
    name: "",
    description: "",
    points_value: 5,
    requirements_type: "excellent_days",
    requirements_days: 10
  });

  // نموذج المتجر
  const [storeForm, setStoreForm] = useState({
    name: "",
    description: "",
    image_url: "",
    points_cost: 0,
    badges_cost: 0,
    item_type: "student",
    stock_quantity: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: badgesData } = await supabase
        .from("badge_settings")
        .select("*")
        .order("created_at", { ascending: false });
      setBadges(badgesData || []);

      const { data: itemsData } = await supabase
        .from("store_items")
        .select("*")
        .order("created_at", { ascending: false });
      setStoreItems(itemsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBadge = async () => {
    if (!badgeForm.name) {
      toast.error("يرجى إدخال اسم الشارة");
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        name: badgeForm.name,
        description: badgeForm.description,
        points_value: badgeForm.points_value,
        requirements_type: badgeForm.requirements_type,
        requirements_value: { days: badgeForm.requirements_days }
      };

      if (editingBadge) {
        const { error } = await supabase
          .from("badge_settings")
          .update(data)
          .eq("id", editingBadge.id);
        if (error) throw error;
        toast.success("تم تحديث الشارة");
      } else {
        const { error } = await supabase
          .from("badge_settings")
          .insert(data);
        if (error) throw error;
        toast.success("تم إضافة الشارة");
      }

      setIsDialogOpen(false);
      resetBadgeForm();
      fetchData();
    } catch (error) {
      console.error("Error saving badge:", error);
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStoreItem = async () => {
    if (!storeForm.name) {
      toast.error("يرجى إدخال اسم الهدية");
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        name: storeForm.name,
        description: storeForm.description || null,
        image_url: storeForm.image_url || null,
        points_cost: storeForm.points_cost,
        badges_cost: storeForm.badges_cost,
        item_type: storeForm.item_type,
        stock_quantity: storeForm.stock_quantity ? parseInt(storeForm.stock_quantity) : null,
        center_id: selectedCenterId || null
      };

      if (editingItem) {
        const { error } = await supabase
          .from("store_items")
          .update(data)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("تم تحديث الهدية");
      } else {
        const { error } = await supabase
          .from("store_items")
          .insert(data);
        if (error) throw error;
        toast.success("تم إضافة الهدية");
      }

      setIsStoreDialogOpen(false);
      resetStoreForm();
      fetchData();
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBadge = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الشارة؟")) return;

    try {
      const { error } = await supabase
        .from("badge_settings")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("تم حذف الشارة");
      fetchData();
    } catch (error) {
      console.error("Error deleting badge:", error);
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const handleDeleteStoreItem = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الهدية؟")) return;

    try {
      const { error } = await supabase
        .from("store_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("تم حذف الهدية");
      fetchData();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const toggleBadgeActive = async (badge: BadgeSetting) => {
    try {
      const { error } = await supabase
        .from("badge_settings")
        .update({ is_active: !badge.is_active })
        .eq("id", badge.id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("Error toggling badge:", error);
    }
  };

  const toggleItemActive = async (item: StoreItem) => {
    try {
      const { error } = await supabase
        .from("store_items")
        .update({ is_active: !item.is_active })
        .eq("id", item.id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("Error toggling item:", error);
    }
  };

  const resetBadgeForm = () => {
    setBadgeForm({
      name: "",
      description: "",
      points_value: 5,
      requirements_type: "excellent_days",
      requirements_days: 10
    });
    setEditingBadge(null);
  };

  const resetStoreForm = () => {
    setStoreForm({
      name: "",
      description: "",
      image_url: "",
      points_cost: 0,
      badges_cost: 0,
      item_type: "student",
      stock_quantity: ""
    });
    setEditingItem(null);
  };

  const openEditBadge = (badge: BadgeSetting) => {
    setEditingBadge(badge);
    setBadgeForm({
      name: badge.name,
      description: badge.description || "",
      points_value: badge.points_value,
      requirements_type: badge.requirements_type,
      requirements_days: badge.requirements_value?.days || 10
    });
    setIsDialogOpen(true);
  };

  const openEditItem = (item: StoreItem) => {
    setEditingItem(item);
    setStoreForm({
      name: item.name,
      description: item.description || "",
      image_url: item.image_url || "",
      points_cost: item.points_cost,
      badges_cost: item.badges_cost,
      item_type: item.item_type,
      stock_quantity: item.stock_quantity?.toString() || ""
    });
    setIsStoreDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="badges" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="badges" className="gap-2">
            <Award className="w-4 h-4" />
            إعدادات الشارات
          </TabsTrigger>
          <TabsTrigger value="store" className="gap-2">
            <Gift className="w-4 h-4" />
            متجر الهدايا
          </TabsTrigger>
        </TabsList>

        {/* تبويب الشارات */}
        <TabsContent value="badges" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-foreground">إدارة الشارات</h3>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetBadgeForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 ml-1" />
                  شارة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingBadge ? "تعديل الشارة" : "إضافة شارة جديدة"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>اسم الشارة</Label>
                    <Input
                      value={badgeForm.name}
                      onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })}
                      placeholder="مثال: المتقن"
                    />
                  </div>
                  <div>
                    <Label>الوصف</Label>
                    <Textarea
                      value={badgeForm.description}
                      onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })}
                      placeholder="شرح كيفية الحصول على الشارة"
                    />
                  </div>
                  <div>
                    <Label>قيمة الشارة (نقاط)</Label>
                    <Input
                      type="number"
                      value={badgeForm.points_value}
                      onChange={(e) => setBadgeForm({ ...badgeForm, points_value: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>نوع المتطلب</Label>
                    <Select
                      value={badgeForm.requirements_type}
                      onValueChange={(v) => setBadgeForm({ ...badgeForm, requirements_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent_days">أيام تقدير ممتاز</SelectItem>
                        <SelectItem value="attendance_month">حضور شهر كامل</SelectItem>
                        <SelectItem value="course_completion">إكمال دورة</SelectItem>
                        <SelectItem value="exam_score">درجة اختبار</SelectItem>
                        <SelectItem value="memorization_pages">صفحات حفظ</SelectItem>
                        <SelectItem value="activities">حضور أنشطة</SelectItem>
                        <SelectItem value="monthly_plan">خطة شهرية</SelectItem>
                        <SelectItem value="extra_effort">اجتهاد إضافي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>عدد الأيام/العدد المطلوب</Label>
                    <Input
                      type="number"
                      value={badgeForm.requirements_days}
                      onChange={(e) => setBadgeForm({ ...badgeForm, requirements_days: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <Button onClick={handleSaveBadge} disabled={isSaving} className="w-full">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {badges.map(badge => (
              <Card key={badge.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Award className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{badge.name}</h4>
                        <p className="text-sm text-muted-foreground">{badge.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{badge.points_value} نقطة</Badge>
                      <Switch
                        checked={badge.is_active}
                        onCheckedChange={() => toggleBadgeActive(badge)}
                      />
                      <Button size="icon" variant="ghost" onClick={() => openEditBadge(badge)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteBadge(badge.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* تبويب المتجر */}
        <TabsContent value="store" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-foreground">متجر الهدايا</h3>
            <Dialog open={isStoreDialogOpen} onOpenChange={(open) => {
              setIsStoreDialogOpen(open);
              if (!open) resetStoreForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 ml-1" />
                  هدية جديدة
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingItem ? "تعديل الهدية" : "إضافة هدية جديدة"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>اسم الهدية</Label>
                    <Input
                      value={storeForm.name}
                      onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                      placeholder="مثال: قلم حبر"
                    />
                  </div>
                  <div>
                    <Label>الوصف</Label>
                    <Textarea
                      value={storeForm.description}
                      onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>رابط الصورة</Label>
                    <Input
                      value={storeForm.image_url}
                      onChange={(e) => setStoreForm({ ...storeForm, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>السعر (نقاط)</Label>
                      <Input
                        type="number"
                        value={storeForm.points_cost}
                        onChange={(e) => setStoreForm({ ...storeForm, points_cost: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label>السعر (شارات)</Label>
                      <Input
                        type="number"
                        value={storeForm.badges_cost}
                        onChange={(e) => setStoreForm({ ...storeForm, badges_cost: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>نوع الهدية</Label>
                    <Select
                      value={storeForm.item_type}
                      onValueChange={(v) => setStoreForm({ ...storeForm, item_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">هدية فردية للطالب</SelectItem>
                        <SelectItem value="halqa">هدية جماعية للحلقة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>الكمية المتاحة (اتركه فارغاً لغير محدود)</Label>
                    <Input
                      type="number"
                      value={storeForm.stock_quantity}
                      onChange={(e) => setStoreForm({ ...storeForm, stock_quantity: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSaveStoreItem} disabled={isSaving} className="w-full">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {storeItems.map(item => (
              <Card key={item.id} className="overflow-hidden">
                <div className="flex">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-20 h-20 object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-muted flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <CardContent className="flex-1 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{item.name}</h4>
                        <div className="flex gap-1 mt-1">
                          {item.points_cost > 0 && (
                            <Badge variant="secondary">{item.points_cost} نقطة</Badge>
                          )}
                          {item.badges_cost > 0 && (
                            <Badge variant="outline">{item.badges_cost} شارة</Badge>
                          )}
                          <Badge variant={item.item_type === "student" ? "default" : "secondary"}>
                            {item.item_type === "student" ? "فردي" : "جماعي"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => toggleItemActive(item)}
                        />
                        <Button size="icon" variant="ghost" onClick={() => openEditItem(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteStoreItem(item.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};