import { useState, useEffect } from "react";
import { ArrowRight, Search, Check, X, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface PurchaseRequest {
  id: string;
  student_id: string;
  store_item_id: string;
  points_spent: number;
  badges_spent: number;
  status: string;
  purchased_at: string;
  delivered_at: string | null;
  student?: {
    id: string;
    full_name: string;
    photo_url: string | null;
  };
  store_item?: {
    id: string;
    name: string;
    image_url: string | null;
  };
}

interface GiftRequestsScreenProps {
  onClose: () => void;
}

export const GiftRequestsScreen = ({ onClose }: GiftRequestsScreenProps) => {
  const { selectedCenterId } = useAuth();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"pending" | "delivered" | "rejected">("pending");
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRequests();
  }, [selectedCenterId]);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from("student_purchases")
        .select(`
          *,
          student:students(id, full_name, photo_url, center_id),
          store_item:store_items(id, name, image_url)
        `)
        .order("purchased_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter by center if needed
      const filtered = selectedCenterId 
        ? (data || []).filter((r: any) => r.student?.center_id === selectedCenterId)
        : data || [];
      
      setRequests(filtered as PurchaseRequest[]);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("حدث خطأ في تحميل الطلبات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessingIds(prev => new Set(prev).add(requestId));
    try {
      const { error } = await supabase
        .from("student_purchases")
        .update({ 
          status: "delivered",
          delivered_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (error) throw error;
      toast.success("تم تسليم الجائزة");
      fetchRequests();
    } catch (error) {
      console.error("Error approving:", error);
      toast.error("حدث خطأ");
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleReject = async (requestId: string, request: PurchaseRequest) => {
    setProcessingIds(prev => new Set(prev).add(requestId));
    try {
      // Refund points if rejecting
      if (request.points_spent > 0) {
        await supabase.from("student_points").insert({
          student_id: request.student_id,
          points: request.points_spent,
          reason: "استرداد نقاط - رفض طلب شراء"
        });
      }

      const { error } = await supabase
        .from("student_purchases")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;
      toast.success("تم رفض الطلب واسترداد النقاط");
      fetchRequests();
    } catch (error) {
      console.error("Error rejecting:", error);
      toast.error("حدث خطأ");
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const getFilteredRequests = () => {
    let filtered = requests.filter(r => {
      if (activeFilter === "pending") return r.status === "pending";
      if (activeFilter === "delivered") return r.status === "delivered";
      if (activeFilter === "rejected") return r.status === "rejected";
      return true;
    });

    if (searchQuery) {
      filtered = filtered.filter(r => 
        r.student?.full_name?.includes(searchQuery) ||
        r.store_item?.name?.includes(searchQuery)
      );
    }

    return filtered;
  };

  const groupRequestsByDate = (reqs: PurchaseRequest[]) => {
    const groups: { [key: string]: PurchaseRequest[] } = {};
    
    reqs.forEach(req => {
      const date = new Date(req.purchased_at);
      let key: string;
      
      if (isToday(date)) {
        key = "اليوم";
      } else if (isYesterday(date)) {
        key = "الأمس";
      } else {
        key = format(date, "d MMMM yyyy", { locale: ar });
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(req);
    });

    return groups;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return formatDistanceToNow(date, { locale: ar, addSuffix: false });
    }
    return format(date, "h:mm a", { locale: ar });
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const filteredRequests = getFilteredRequests();
  const groupedRequests = groupRequestsByDate(filteredRequests);

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon">
            <Filter className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">طلبات شراء الجوائز</h1>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث عن اسم الطالب..."
              className="pr-10 text-right"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pb-4 flex gap-2">
          <Button
            variant={activeFilter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("pending")}
            className="gap-1"
          >
            قيد الانتظار
            {pendingCount > 0 && (
              <span className="bg-primary-foreground text-primary rounded-full px-1.5 text-xs">
                {pendingCount}
              </span>
            )}
          </Button>
          <Button
            variant={activeFilter === "delivered" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("delivered")}
          >
            تمت الموافقة
          </Button>
          <Button
            variant={activeFilter === "rejected" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("rejected")}
          >
            مرفوضة
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            لا توجد طلبات
          </div>
        ) : (
          Object.entries(groupedRequests).map(([dateKey, reqs]) => (
            <div key={dateKey} className="space-y-3">
              <p className="text-sm text-muted-foreground text-left">{dateKey}</p>
              
              {reqs.map(req => (
                <div key={req.id} className="bg-background rounded-xl p-4 space-y-3">
                  {/* Student Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {req.status === "pending" && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          قيد الانتظار
                        </Badge>
                      )}
                      {req.status === "delivered" && (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
                          <Check className="w-3 h-3" />
                          تمت الموافقة
                        </Badge>
                      )}
                      {req.status === "rejected" && (
                        <Badge variant="destructive" className="gap-1">
                          <X className="w-3 h-3" />
                          مرفوضة
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-medium text-foreground">{req.student?.full_name || "طالب"}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(req.purchased_at)}</p>
                      </div>
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={req.student?.photo_url || undefined} />
                        <AvatarFallback className="bg-amber-100 text-amber-700">
                          {req.student?.full_name?.charAt(0) || "ط"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>

                  {/* Item Info */}
                  <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                    <div className="text-right">
                      <p className="font-medium text-foreground">{req.store_item?.name || "جائزة"}</p>
                      <p className="text-sm text-primary font-semibold">{req.points_spent} نقطة</p>
                    </div>
                    {req.store_item?.image_url ? (
                      <img 
                        src={req.store_item.image_url} 
                        alt={req.store_item.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        🎁
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {req.status === "pending" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => handleReject(req.id, req)}
                        disabled={processingIds.has(req.id)}
                      >
                        {processingIds.has(req.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <X className="w-4 h-4 ml-1" />
                            رفض الطلب
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-700 dark:hover:bg-emerald-900/20"
                        onClick={() => handleApprove(req.id)}
                        disabled={processingIds.has(req.id)}
                      >
                        {processingIds.has(req.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 ml-1" />
                            موافقة
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <Button
        size="icon"
        className="fixed bottom-6 left-6 w-14 h-14 rounded-full shadow-lg"
        onClick={() => setActiveFilter("pending")}
      >
        <Filter className="w-6 h-6" />
      </Button>
    </div>
  );
};
