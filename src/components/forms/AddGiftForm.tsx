import { useState, useRef } from "react";
import { ArrowRight, Camera, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

interface AddGiftFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AddGiftForm = ({ onClose, onSuccess }: AddGiftFormProps) => {
  const { selectedCenterId } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    points_cost: 0,
    badges_cost: 0,
    item_type: "student",
    stock_quantity: "",
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (itemId: string): Promise<string | null> => {
    if (!imageFile) return null;
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${itemId}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('store-items')
      .upload(fileName, imageFile, { upsert: true });
    
    if (error) {
      console.error("Error uploading image:", error);
      return null;
    }
    
    const { data } = supabase.storage.from('store-items').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("يرجى إدخال اسم الجائزة");
      return;
    }

    setIsSubmitting(true);

    try {
      // First insert the item
      const { data: insertedItem, error: insertError } = await supabase
        .from("store_items")
        .insert({
          name: formData.name.trim(),
          description: formData.description || null,
          points_cost: formData.points_cost,
          badges_cost: formData.badges_cost,
          item_type: formData.item_type,
          stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : null,
          center_id: selectedCenterId || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Upload image if selected
      if (imageFile && insertedItem) {
        const imageUrl = await uploadImage(insertedItem.id);
        if (imageUrl) {
          await supabase
            .from("store_items")
            .update({ image_url: imageUrl })
            .eq("id", insertedItem.id);
        }
      }

      toast.success("تم إضافة الجائزة بنجاح");
      onSuccess();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "حدث خطأ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold text-foreground">إضافة جائزة</h1>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 pb-32 space-y-6">
        {/* صورة الجائزة */}
        <div className="space-y-2">
          <Label className="text-right block">صورة الجائزة</Label>
          <div 
            className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors min-h-[200px]"
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="صورة الجائزة" className="max-h-40 rounded-lg object-contain" />
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground">اضغط لرفع صورة</p>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>

        <div className="border-t border-border" />

        {/* اسم الجائزة */}
        <div className="space-y-2">
          <Label>اسم الجائزة *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="مثال: كرة قدم، مصحف..."
            className="text-right"
          />
        </div>

        {/* عدد النقاط */}
        <div className="space-y-2">
          <Label>عدد النقاط</Label>
          <div className="relative">
            <Input
              type="number"
              value={formData.points_cost}
              onChange={(e) => setFormData({ ...formData, points_cost: parseInt(e.target.value) || 0 })}
              className="text-right pr-10"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Star className="w-4 h-4 text-amber-600" />
            </div>
          </div>
        </div>

        {/* عدد الشارات */}
        <div className="space-y-2">
          <Label>عدد الشارات (اختياري)</Label>
          <Input
            type="number"
            value={formData.badges_cost}
            onChange={(e) => setFormData({ ...formData, badges_cost: parseInt(e.target.value) || 0 })}
            className="text-right"
          />
        </div>

        {/* نوع الجائزة */}
        <div className="space-y-2">
          <Label>نوع الجائزة</Label>
          <Select value={formData.item_type} onValueChange={(v) => setFormData({ ...formData, item_type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">جائزة فردية للطالب</SelectItem>
              <SelectItem value="halqa">جائزة جماعية للحلقة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* الكمية */}
        <div className="space-y-2">
          <Label>الكمية المتاحة (اختياري)</Label>
          <Input
            type="number"
            value={formData.stock_quantity}
            onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
            placeholder="اتركه فارغاً لكمية غير محدودة"
            className="text-right"
          />
        </div>

        {/* وصف الجائزة */}
        <div className="space-y-2">
          <Label>وصف الجائزة (اختياري)</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="أدخل تفاصيل إضافية عن الجائزة..."
            className="min-h-[100px]"
          />
        </div>
      </form>

      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 space-y-3">
        <Button 
          type="submit" 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-12"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "حفظ الجائزة"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} className="w-full h-12">
          إلغاء
        </Button>
      </div>
    </div>
  );
};
