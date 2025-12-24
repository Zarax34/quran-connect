import { BookOpen } from "lucide-react";

export const SplashScreen = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center islamic-pattern relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-20 right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 left-20 w-48 h-48 bg-secondary/10 rounded-full blur-3xl animate-pulse" />
      
      {/* Logo container */}
      <div className="relative z-10 flex flex-col items-center gap-6 animate-slide-up">
        <div className="relative">
          <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-glow">
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-primary-foreground" strokeWidth={1.5} />
            </div>
          </div>
          {/* Decorative ring */}
          <div className="absolute inset-0 w-28 h-28 rounded-full border-2 border-secondary/50 animate-spin" style={{ animationDuration: '8s' }} />
        </div>
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            مراكز تحفيظ القرآن
          </h1>
          <p className="text-muted-foreground text-lg">
            نظام إدارة الحلقات القرآنية
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex gap-1.5 mt-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>

      {/* Quran verse */}
      <div className="absolute bottom-12 text-center px-6">
        <p className="font-serif text-muted-foreground text-lg leading-relaxed">
          ﴿ إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ ﴾
        </p>
      </div>
    </div>
  );
};
