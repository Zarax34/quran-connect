import { useState, useEffect } from "react";
import { User, Lock, Sun, Moon, Loader2, Save, Eye, EyeOff, Fingerprint, Bell, Trash2, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useCredentialsStorage } from "@/hooks/useCredentialsStorage";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const UserSettings = () => {
  const { profile, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { 
    isBiometricEnabled, 
    toggleBiometric, 
    clearCredentials, 
    hasStoredCredentials,
    isBiometricAvailable,
    setPin,
    disablePin,
    isPinEnabled
  } = useCredentialsStorage();
  const { registerForPushNotifications } = usePushNotifications(user?.id);
  
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter');

  useEffect(() => {
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
    };
    checkBiometric();

    // Check notification permission
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, [isBiometricAvailable]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast.error("يرجى إدخال الاسم");
      return;
    }

    if (!user?.id) {
      toast.error("لم يتم العثور على المستخدم");
      return;
    }

    setIsUpdatingName(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("تم تحديث الاسم بنجاح");
    } catch (error: any) {
      console.error("Error updating name:", error);
      toast.error("حدث خطأ في تحديث الاسم");
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("كلمة المرور الجديدة غير متطابقة");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("تم تحديث كلمة المرور بنجاح");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast.error(error.message || "حدث خطأ في تحديث كلمة المرور");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleToggleBiometric = (enabled: boolean) => {
    if (!hasStoredCredentials && enabled) {
      toast.error("يجب تسجيل الدخول أولاً لتفعيل البصمة");
      return;
    }
    
    const success = toggleBiometric(enabled);
    if (success) {
      toast.success(enabled ? "تم تفعيل الدخول بالبصمة" : "تم إلغاء الدخول بالبصمة");
    } else {
      toast.error("حدث خطأ في تغيير إعدادات البصمة");
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const granted = await registerForPushNotifications();
      setNotificationsEnabled(granted);
      if (granted) {
        toast.success("تم تفعيل الإشعارات");
      } else {
        toast.error("لم يتم منح إذن الإشعارات");
      }
    } else {
      setNotificationsEnabled(false);
      toast.success("تم إلغاء الإشعارات");
    }
  };

  const handleClearCredentials = () => {
    clearCredentials();
    toast.success("تم حذف بيانات الدخول المحفوظة");
  };

  const handleSetPin = () => {
    if (pinStep === 'enter') {
      if (newPin.length !== 4) {
        toast.error("يجب إدخال 4 أرقام");
        return;
      }
      setPinStep('confirm');
    } else {
      if (confirmPin !== newPin) {
        toast.error("رمز PIN غير متطابق");
        setConfirmPin("");
        return;
      }
      const success = setPin(newPin);
      if (success) {
        toast.success("تم تعيين رمز PIN بنجاح");
        setShowPinDialog(false);
        setNewPin("");
        setConfirmPin("");
        setPinStep('enter');
      } else {
        toast.error("حدث خطأ في تعيين رمز PIN");
      }
    }
  };

  const handleDisablePin = () => {
    const success = disablePin();
    if (success) {
      toast.success("تم إلغاء رمز PIN");
    } else {
      toast.error("حدث خطأ في إلغاء رمز PIN");
    }
  };

  const openPinDialog = () => {
    setNewPin("");
    setConfirmPin("");
    setPinStep('enter');
    setShowPinDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Theme Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          {theme === "dark" ? (
            <Moon className="w-5 h-5 text-primary" />
          ) : (
            <Sun className="w-5 h-5 text-primary" />
          )}
          <h3 className="text-lg font-semibold text-foreground">نمط التطبيق</h3>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-foreground">الوضع الليلي</Label>
            <p className="text-sm text-muted-foreground">
              تفعيل الوضع الداكن للتطبيق
            </p>
          </div>
          <Switch
            checked={theme === "dark"}
            onCheckedChange={toggleTheme}
          />
        </div>
      </Card>

      {/* Biometric & Security Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Fingerprint className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">تسجيل الدخول السريع</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-foreground">الدخول بالبصمة</Label>
              <p className="text-sm text-muted-foreground">
                {biometricAvailable 
                  ? "استخدم بصمة الإصبع لتسجيل الدخول السريع"
                  : "البصمة غير متوفرة على هذا الجهاز"}
              </p>
            </div>
            <Switch
              checked={isBiometricEnabled}
              onCheckedChange={handleToggleBiometric}
              disabled={!biometricAvailable || !hasStoredCredentials}
            />
          </div>

          {hasStoredCredentials && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                  حذف بيانات الدخول المحفوظة
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>حذف بيانات الدخول</AlertDialogTitle>
                  <AlertDialogDescription>
                    هل أنت متأكد من حذف بيانات الدخول المحفوظة؟ سيتعين عليك إدخال البيانات يدوياً في المرة القادمة.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearCredentials}>
                    حذف
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* PIN Settings */}
          <div className="pt-4 border-t border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-foreground flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  الدخول برمز PIN
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isPinEnabled 
                    ? "رمز PIN مفعّل - يمكنك الدخول بـ 4 أرقام"
                    : "استخدم رمز من 4 أرقام للدخول السريع"}
                </p>
              </div>
              <Switch
                checked={isPinEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    openPinDialog();
                  } else {
                    handleDisablePin();
                  }
                }}
                disabled={!hasStoredCredentials}
              />
            </div>

            {isPinEnabled && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={openPinDialog}
                className="gap-2"
              >
                <KeyRound className="w-4 h-4" />
                تغيير رمز PIN
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">الإشعارات</h3>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-foreground">إشعارات التطبيق</Label>
            <p className="text-sm text-muted-foreground">
              استلام الإشعارات حتى عند إغلاق التطبيق
            </p>
          </div>
          <Switch
            checked={notificationsEnabled}
            onCheckedChange={handleToggleNotifications}
          />
        </div>
      </Card>

      {/* Name Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">تغيير الاسم</h3>
        </div>
        
        <form onSubmit={handleUpdateName} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">الاسم الكامل</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="أدخل الاسم الجديد"
            />
          </div>
          
          <Button type="submit" disabled={isUpdatingName} className="gap-2">
            {isUpdatingName ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            حفظ الاسم
          </Button>
        </form>
      </Card>

      {/* Password Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">تغيير كلمة المرور</h3>
        </div>
        
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
                className="pl-10"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور الجديدة"
                className="pl-10"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <Button type="submit" disabled={isUpdatingPassword} className="gap-2">
            {isUpdatingPassword ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            تحديث كلمة المرور
          </Button>
        </form>
      </Card>

      {/* PIN Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {pinStep === 'enter' ? 'تعيين رمز PIN' : 'تأكيد رمز PIN'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {pinStep === 'enter' 
                ? 'أدخل رمزاً من 4 أرقام للدخول السريع'
                : 'أعد إدخال الرمز للتأكيد'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center py-6">
            <InputOTP 
              maxLength={4} 
              value={pinStep === 'enter' ? newPin : confirmPin}
              onChange={(value) => {
                if (pinStep === 'enter') {
                  setNewPin(value);
                } else {
                  setConfirmPin(value);
                }
              }}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowPinDialog(false);
                setNewPin("");
                setConfirmPin("");
                setPinStep('enter');
              }}
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleSetPin}
              disabled={(pinStep === 'enter' ? newPin.length : confirmPin.length) !== 4}
            >
              {pinStep === 'enter' ? 'التالي' : 'تأكيد'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
