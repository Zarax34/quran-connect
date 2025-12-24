import { useState } from "react";
import { 
  ArrowRight, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  BookOpen,
  Fingerprint
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface Props {
  onLogin: () => void;
  onBack: () => void;
  centerName: string;
}

export const LoginScreen = ({ onLogin, onBack, centerName }: Props) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    setIsLoading(true);
    
    // Simulate login
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    toast.success("تم تسجيل الدخول بنجاح");
    setIsLoading(false);
    onLogin();
  };

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
            {/* Username Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                اسم المستخدم
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="أدخل اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pr-10 h-12 bg-background border-border/50 rounded-xl"
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
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
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

            {/* Biometric Login */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl border-border/50 hover:bg-accent/50"
            >
              <Fingerprint className="w-5 h-5 ml-2" />
              الدخول بالبصمة
            </Button>
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
