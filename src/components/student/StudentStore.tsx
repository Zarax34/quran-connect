import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Gift, 
  ShoppingCart, 
  Loader2, 
  Star,
  Award,
  Users,
  ThumbsUp,
  ThumbsDown,
  Check,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StoreItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  points_cost: number;
  badges_cost: number;
  item_type: string;
  stock_quantity: number | null;
}

interface Vote {
  id: string;
  store_item_id: string;
  votes_for: number;
  votes_against: number;
  total_students: number;
  required_votes: number;
  status: string;
  store_item?: StoreItem;
  my_vote?: boolean | null;
}

interface StudentStoreProps {
  studentId: string;
  halqaId?: string | null;
}

export const StudentStore = ({ studentId, halqaId }: StudentStoreProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [studentItems, setStudentItems] = useState<StoreItem[]>([]);
  const [halqaItems, setHalqaItems] = useState<StoreItem[]>([]);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [availableBadges, setAvailableBadges] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [halqaPoints, setHalqaPoints] = useState(0);
  const [activeVotes, setActiveVotes] = useState<Vote[]>([]);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetchStoreData();
  }, [studentId, halqaId]);

  const fetchStoreData = async () => {
    try {
      // جلب النقاط المتاحة
      const { data: availableData } = await supabase
        .rpc("get_student_available_points", { _student_id: studentId });
      setAvailablePoints(availableData || 0);

      // جلب إجمالي النقاط
      const { data: totalData } = await supabase
        .rpc("get_student_total_points", { _student_id: studentId });
      setTotalPoints(totalData || 0);

      // جلب الشارات المتاحة
      const { data: badgesData } = await supabase
        .rpc("get_student_available_badges", { _student_id: studentId });
      setAvailableBadges(badgesData || 0);

      // جلب نقاط الحلقة
      if (halqaId) {
        const { data: halqaData } = await supabase
          .rpc("get_halqa_total_points", { _halqa_id: halqaId });
        setHalqaPoints(halqaData || 0);
      }

      // جلب منتجات الطلاب
      const { data: studentItemsData } = await supabase
        .from("store_items")
        .select("*")
        .eq("item_type", "student")
        .eq("is_active", true);
      setStudentItems(studentItemsData || []);

      // جلب منتجات الحلقة
      const { data: halqaItemsData } = await supabase
        .from("store_items")
        .select("*")
        .eq("item_type", "halqa")
        .eq("is_active", true);
      setHalqaItems(halqaItemsData || []);

      // جلب التصويتات النشطة للحلقة
      if (halqaId) {
        const { data: votesData } = await supabase
          .from("halqa_purchase_votes")
          .select(`
            *,
            store_items (*)
          `)
          .eq("halqa_id", halqaId)
          .eq("status", "voting");

        if (votesData) {
          // جلب تصويتي الشخصي
          const votesWithMyVote = await Promise.all(
            votesData.map(async (vote: any) => {
              const { data: myVoteData } = await supabase
                .from("student_votes")
                .select("vote")
                .eq("vote_id", vote.id)
                .eq("student_id", studentId)
                .maybeSingle();

              return {
                ...vote,
                store_item: vote.store_items,
                my_vote: myVoteData?.vote ?? null
              };
            })
          );
          setActiveVotes(votesWithMyVote);
        }
      }
    } catch (error) {
      console.error("Error fetching store data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (item: StoreItem) => {
    if (item.points_cost > availablePoints && item.badges_cost > availableBadges) {
      toast.error("لا تملك نقاط أو شارات كافية");
      return;
    }

    setIsPurchasing(item.id);
    try {
      const { error } = await supabase.from("student_purchases").insert({
        student_id: studentId,
        store_item_id: item.id,
        points_spent: item.points_cost,
        badges_spent: item.badges_cost,
        status: "pending"
      });

      if (error) throw error;

      toast.success("تم طلب الشراء بنجاح! في انتظار الموافقة");
      fetchStoreData();
    } catch (error) {
      console.error("Error purchasing:", error);
      toast.error("حدث خطأ أثناء الشراء");
    } finally {
      setIsPurchasing(null);
    }
  };

  const handleInitiateVote = async (item: StoreItem) => {
    if (!halqaId) return;

    try {
      // جلب عدد طلاب الحلقة
      const { count } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("halqa_id", halqaId)
        .eq("is_active", true);

      const totalStudents = count || 1;
      const requiredVotes = Math.ceil(totalStudents / 2);

      const { error } = await supabase.from("halqa_purchase_votes").insert({
        halqa_id: halqaId,
        store_item_id: item.id,
        initiated_by: studentId,
        total_students: totalStudents,
        required_votes: requiredVotes,
        ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      if (error) throw error;

      toast.success("تم بدء التصويت! سيتم إعلام زملائك");
      fetchStoreData();
    } catch (error) {
      console.error("Error initiating vote:", error);
      toast.error("حدث خطأ أثناء بدء التصويت");
    }
  };

  const handleVote = async (voteId: string, voteValue: boolean) => {
    try {
      const { error } = await supabase.from("student_votes").insert({
        vote_id: voteId,
        student_id: studentId,
        vote: voteValue
      });

      if (error) throw error;

      // تحديث عدد الأصوات
      const vote = activeVotes.find(v => v.id === voteId);
      if (vote) {
        const updateData = voteValue 
          ? { votes_for: vote.votes_for + 1 }
          : { votes_against: vote.votes_against + 1 };
        
        await supabase
          .from("halqa_purchase_votes")
          .update(updateData)
          .eq("id", voteId);
      }

      toast.success("تم تسجيل صوتك!");
      fetchStoreData();
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("حدث خطأ أثناء التصويت");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ملخص النقاط */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4 pb-4 text-center">
            <Star className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-primary">{availablePoints}</p>
            <p className="text-xs text-muted-foreground">نقاط متاحة</p>
            <p className="text-xs text-muted-foreground">(من {totalPoints} إجمالي)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-100/50 to-amber-50/30 dark:from-amber-900/20 dark:to-amber-800/10">
          <CardContent className="pt-4 pb-4 text-center">
            <Award className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-600">{availableBadges}</p>
            <p className="text-xs text-muted-foreground">شارات متاحة</p>
          </CardContent>
        </Card>
      </div>

      {halqaId && (
        <Card className="bg-gradient-to-br from-green-100/50 to-green-50/30 dark:from-green-900/20 dark:to-green-800/10">
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{halqaPoints}</p>
            <p className="text-xs text-muted-foreground">نقاط الحلقة</p>
          </CardContent>
        </Card>
      )}

      {/* التبويبات */}
      <Tabs defaultValue="student" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="student">هدايا شخصية</TabsTrigger>
          <TabsTrigger value="halqa">هدايا الحلقة</TabsTrigger>
        </TabsList>

        <TabsContent value="student" className="mt-4 space-y-3">
          {studentItems.length === 0 ? (
            <Card className="p-6 text-center">
              <Gift className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">لا توجد هدايا متاحة حالياً</p>
            </Card>
          ) : (
            studentItems.map(item => (
              <Card key={item.id} className="overflow-hidden">
                <div className="flex">
                  {item.image_url && (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-24 h-24 object-cover"
                    />
                  )}
                  <CardContent className="flex-1 pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-foreground">{item.name}</h4>
                      <div className="flex gap-1">
                        {item.points_cost > 0 && (
                          <Badge variant="secondary">{item.points_cost} نقطة</Badge>
                        )}
                        {item.badges_cost > 0 && (
                          <Badge variant="outline">{item.badges_cost} شارة</Badge>
                        )}
                      </div>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                    )}
                    <Button 
                      size="sm" 
                      onClick={() => handlePurchase(item)}
                      disabled={isPurchasing === item.id || (item.points_cost > availablePoints && item.badges_cost > availableBadges)}
                    >
                      {isPurchasing === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 ml-1" />
                          شراء
                        </>
                      )}
                    </Button>
                  </CardContent>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="halqa" className="mt-4 space-y-4">
          {/* التصويتات النشطة */}
          {activeVotes.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <ThumbsUp className="w-4 h-4" />
                تصويتات جارية
              </h4>
              {activeVotes.map(vote => (
                <Card key={vote.id} className="border-primary/30">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-3">
                      <h5 className="font-medium text-foreground">
                        {vote.store_item?.name}
                      </h5>
                      <Badge variant="outline">
                        {vote.votes_for}/{vote.required_votes} للموافقة
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(vote.votes_for / vote.total_students) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {vote.votes_for} موافق - {vote.votes_against} رافض
                      </span>
                    </div>

                    {vote.my_vote === null ? (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 text-green-600 hover:bg-green-50"
                          onClick={() => handleVote(vote.id, true)}
                        >
                          <Check className="w-4 h-4 ml-1" />
                          موافق
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 text-red-600 hover:bg-red-50"
                          onClick={() => handleVote(vote.id, false)}
                        >
                          <X className="w-4 h-4 ml-1" />
                          رافض
                        </Button>
                      </div>
                    ) : (
                      <Badge variant={vote.my_vote ? "default" : "destructive"}>
                        {vote.my_vote ? "صوتت بالموافقة" : "صوتت بالرفض"}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* منتجات الحلقة */}
          <h4 className="font-semibold text-foreground">هدايا جماعية للحلقة</h4>
          {halqaItems.length === 0 ? (
            <Card className="p-6 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">لا توجد هدايا جماعية متاحة</p>
            </Card>
          ) : (
            halqaItems.map(item => (
              <Card key={item.id} className="overflow-hidden">
                <div className="flex">
                  {item.image_url && (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-24 h-24 object-cover"
                    />
                  )}
                  <CardContent className="flex-1 pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-foreground">{item.name}</h4>
                      <Badge variant="secondary">{item.points_cost} نقطة حلقة</Badge>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleInitiateVote(item)}
                      disabled={!halqaId || halqaPoints < item.points_cost}
                    >
                      <ThumbsUp className="w-4 h-4 ml-1" />
                      بدء تصويت للشراء
                    </Button>
                  </CardContent>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};