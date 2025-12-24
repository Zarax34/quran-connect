import { useState, useEffect } from "react";
import { SplashScreen } from "@/components/SplashScreen";
import { CenterSelectionScreen } from "@/components/CenterSelectionScreen";
import { LoginScreen } from "@/components/LoginScreen";
import { DashboardScreen } from "@/components/DashboardScreen";

type AppState = "splash" | "centerSelection" | "login" | "dashboard";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("splash");
  const [selectedCenter, setSelectedCenter] = useState<string | null>(null);

  useEffect(() => {
    // Simulate splash screen duration
    const timer = setTimeout(() => {
      setAppState("centerSelection");
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleCenterSelect = (centerId: string) => {
    setSelectedCenter(centerId);
    setAppState("login");
  };

  const handleLogin = () => {
    setAppState("dashboard");
  };

  const handleBackToCenter = () => {
    setAppState("centerSelection");
    setSelectedCenter(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {appState === "splash" && <SplashScreen />}
      {appState === "centerSelection" && (
        <CenterSelectionScreen onSelectCenter={handleCenterSelect} />
      )}
      {appState === "login" && (
        <LoginScreen 
          onLogin={handleLogin} 
          onBack={handleBackToCenter}
          centerName={selectedCenter || ""}
        />
      )}
      {appState === "dashboard" && <DashboardScreen />}
    </div>
  );
};

export default Index;
