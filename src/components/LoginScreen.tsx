import { useState, useEffect } from "react";
import { 
  ArrowRight, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  BookOpen,
  Fingerprint,
  Loader2,
  KeyRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCredentialsStorage } from "@/hooks/useCredentialsStorage";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface Props {
  onLogin: () => void;
  onBack: () => void;
  centerName: string;
  centerId: string;
}

export const LoginScreen = ({ onLogin, onBack, centerName, centerId }: Props) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [isPinLoading, setIsPinLoading] = useState(false);
  const [showPinLogin, setShowPinLogin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const { signIn, setSelectedCenterId, user } = useAuth();
  const { 
    storedCredentials, 
    saveCredentials, 
    authenticateWithBiometric,
    isBiometricEnabled,
    hasStoredCredentials,
    verifyPin,
    isPinEnabled
  } = useCredentialsStorage();
  const { registerForPushNotifications } = usePushNotifications(user?.id);

  // Check for stored credentials on mount
  useEffect(() => {
    if (storedCredentials && storedCredentials.centerId === centerId) {
      setIdentifier(storedCredentials.identifier);
    }
  }, [storedCredentials, centerId]);

  const handleSuccessfulLogin = async () => {
    // Save credentials for future logins
    saveCredentials({
      identifier,
      password,
      centerId,
      centerName
    });

    // Register for push notifications
    await registerForPushNotifications();

    setSelectedCenterId(centerId);
    toast.success("تم تسجيل الدخول بنجاح");
    onLogin();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!identifier || !password) {
      toast.error("يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(identifier, password, centerId);
      
      if (error) {
        // Handle specific error messages
        const errorMessage = error.message || "";
        
        if (errorMessage.includes("غير مسجل في هذا المركز")) {
          toast.error("هذا الحساب غير مسجل في هذا المركز. يرجى اختيار المركز الصحيح.");
        } else if (errorMessage.includes("غير مسجل في أي مركز")) {
          toast.error("هذا الحساب غير مسجل في أي مركز. يرجى التواصل مع المسؤول.");
        } else if (errorMessage.includes("Invalid login credentials") || errorMessage.includes("غير صحيحة")) {
          toast.error("اسم المستخدم أو كلمة المرور غير صحيحة");
        } else if (errorMessage.includes("Email not confirmed")) {
          toast.error("يرجى تأكيد البريد الإلكتروني أولاً");
        } else if (errorMessage.includes("غير موجود")) {
          toast.error("اسم المستخدم غير موجود");
        } else {
          toast.error(errorMessage || "حدث خطأ في تسجيل الدخول");
        }
        setIsLoading(false);
        return;
      }

      // Wait a moment for roles to load
      await new Promise((resolve) => setTimeout(resolve, 500));
      await handleSuccessfulLogin();
    } catch (error) {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!storedCredentials || storedCredentials.centerId !== centerId) {
      toast.error("لم يتم العثور على بيانات الدخول المحفوظة لهذا المركز");
      return;
    }

    if (!isBiometricEnabled) {
      toast.error("البصمة غير مفعلة. يرجى تفعيلها من الإعدادات بعد تسجيل الدخول");
      return;
    }

    setIsBiometricLoading(true);

    try {
      const authenticated = await authenticateWithBiometric();
      
      if (!authenticated) {
        toast.error("فشل التحقق من البصمة");
        setIsBiometricLoading(false);
        return;
      }

      // Login with stored credentials
      const { error } = await signIn(
        storedCredentials.identifier, 
        storedCredentials.password,
        centerId
      );
      
      if (error) {
        const errorMessage = error.message || "";
        if (errorMessage.includes("غير مسجل في هذا المركز")) {
          toast.error("هذا الحساب غير مسجل في هذا المركز");
        } else {
          toast.error("فشل تسجيل الدخول. يرجى تسجيل الدخول يدوياً");
        }
        setIsBiometricLoading(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      setSelectedCenterId(centerId);
      await registerForPushNotifications();
      toast.success("تم تسجيل الدخول بنجاح");
      onLogin();
    } catch (error) {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsBiometricLoading(false);
    }
  };

  const handlePinLogin = async () => {
    if (!storedCredentials || storedCredentials.centerId !== centerId) {
      toast.error("لم يتم العثور على بيانات الدخول المحفوظة لهذا المركز");
      return;
    }

    if (pinInput.length !== 4) {
      toast.error("يرجى إدخال رمز PIN كاملاً");
      return;
    }

    const isValid = verifyPin(pinInput);
    if (!isValid) {
      toast.error("رمز PIN غير صحيح");
      setPinInput("");
      return;
    }

    setIsPinLoading(true);

    try {
      const { error } = await signIn(
        storedCredentials.identifier, 
        storedCredentials.password,
        centerId
      );
      
      if (error) {
        const errorMessage = error.message || "";
        if (errorMessage.includes("غير مسجل في هذا المركز")) {
          toast.error("هذا الحساب غير مسجل في هذا المركز");
        } else if (errorMessage.includes("غير صحيحة")) {
          toast.error("بيانات الدخول المحفوظة غير صحيحة. يرجى تسجيل الدخول يدوياً");
        } else {
          toast.error("فشل تسجيل الدخول. يرجى تسجيل الدخول يدوياً");
        }
        setIsPinLoading(false);
        setShowPinLogin(false);
        setPinInput("");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      setSelectedCenterId(centerId);
      await registerForPushNotifications();
      toast.success("تم تسجيل الدخول بنجاح");
      onLogin();
    } catch (error) {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsPinLoading(false);
    }
  };

  const canUseBiometric = hasStoredCredentials && 
    storedCredentials?.centerId === centerId && 
    isBiometricEnabled;

  const canUsePin = hasStoredCredentials && 
    storedCredentials?.centerId === centerId && 
    isPinEnabled;

  // Auto-login with PIN when 4 digits entered
  useEffect(() => {
    if (showPinLogin && pinInput.length === 4) {
      handlePinLogin();
    }
  }, [pinInput, showPinLogin]);

  if (showPinLogin) {
    return (
      <div className="min-h-screen bg-background islamic-pattern relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-primary/5 to-transparent" />
        
        <div className="sticky top-0 z-40 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowPinLogin(false);
              setPinInput("");
            }}
            className="rounded-xl hover:bg-card"
          >
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="relative z-10 px-6 pt-8 pb-12 max-w-md mx-auto">
          <div className="text-center mb-8 animate-slide-down">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              الدخول برمز PIN
            </h1>
            <p className="text-muted-foreground mt-2">
              أدخل رمز PIN الخاص بك
            </p>
          </div>

          <Card className="p-8 bg-card/80 backdrop-blur-sm border-border/50 shadow-lg animate-slide-up">
            <div className="flex flex-col items-center gap-6">
              <InputOTP 
                maxLength={4} 
                value={pinInput}
                onChange={setPinInput}
                disabled={isPinLoading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>

              {isPinLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري التسجيل...</span>
                </div>
              )}

              <Button
                variant="link"
                onClick={() => {
                  setShowPinLogin(false);
                  setPinInput("");
                }}
                className="text-muted-foreground"
              >
                الدخول بكلمة المرور
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const canUseBiometricOriginal = hasStoredCredentials && 
    storedCredentials?.centerId === centerId && 
    isBiometricEnabled;

  return (
    <div className="min-h-screen bg-background islamic-pattern relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-primary/5 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-primary/5 to-transparent" />
      
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-xl hover:bg-card"
        >
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 pt-4 pb-12 max-w-md mx-auto">
        {/* Logo & Title */}
        <div className="text-center mb-8 animate-slide-down">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            تسجيل الدخول
          </h1>
          <p className="text-muted-foreground mt-2">
            {centerName}
          </p>
        </div>

        {/* Login Form */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-lg animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username/Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                اسم المستخدم أو البريد الإلكتروني
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="أدخل اسم المستخدم أو البريد الإلكتروني"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pr-10 h-12 bg-background border-border/50 rounded-xl"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 pl-10 h-12 bg-background border-border/50 rounded-xl"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl text-base font-semibold"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري التسجيل...</span>
                </div>
              ) : (
                "تسجيل الدخول"
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground">أو</span>
              </div>
            </div>

            {/* Quick Login Options */}
            <div className="grid grid-cols-2 gap-3">
              {/* PIN Login */}
              <Button
                type="button"
                variant="outline"
                disabled={!canUsePin}
                onClick={() => setShowPinLogin(true)}
                className="h-12 rounded-xl border-border/50 hover:bg-accent/50"
              >
                <KeyRound className="w-5 h-5 ml-2" />
                رمز PIN
              </Button>

              {/* Biometric Login */}
              <Button
                type="button"
                variant="outline"
                disabled={isBiometricLoading || !canUseBiometric}
                onClick={handleBiometricLogin}
                className="h-12 rounded-xl border-border/50 hover:bg-accent/50"
              >
                {isBiometricLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                ) : (
                  <Fingerprint className="w-5 h-5 ml-2" />
                )}
                البصمة
              </Button>
            </div>

            {!canUseBiometric && !canUsePin && hasStoredCredentials && storedCredentials?.centerId === centerId && (
              <p className="text-xs text-center text-muted-foreground">
                لتفعيل الدخول السريع، سجل الدخول ثم فعّله من الإعدادات
              </p>
            )}
          </form>
        </Card>

        {/* Footer Text */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          نسيت كلمة المرور؟{" "}
          <button className="text-primary font-medium hover:underline">
            تواصل مع المسؤول
          </button>
        </p>
      </div>
    </div>
  );
};
