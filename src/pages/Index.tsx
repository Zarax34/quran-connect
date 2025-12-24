import { useState, useEffect } from "react";
import { SplashScreen } from "@/components/SplashScreen";
import { CenterSelectionScreen } from "@/components/CenterSelectionScreen";
import { LoginScreen } from "@/components/LoginScreen";
import { DashboardScreen } from "@/components/DashboardScreen";
import { useAuth } from "@/contexts/AuthContext";

type AppState = "splash" | "centerSelection" | "login" | "dashboard";

const Index = () => {
  const { user, isLoading, isSuperAdmin, selectedCenterId, setSelectedCenterId } = useAuth();
  const [appState, setAppState] = useState<AppState>("splash");
  const [selectedCenterName, setSelectedCenterName] = useState<string>("");

  useEffect(() => {
    // Splash screen duration
    const timer = setTimeout(() => {
      if (user) {
        // If user is logged in and has selected a center (or is super_admin)
        if (isSuperAdmin || selectedCenterId) {
          setAppState("dashboard");
        } else {
          setAppState("centerSelection");
        }
      } else {
        setAppState("centerSelection");
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // After auth state changes
  useEffect(() => {
    if (!isLoading && appState !== "splash") {
      if (user && (isSuperAdmin || selectedCenterId)) {
        setAppState("dashboard");
      }
    }
  }, [user, isLoading, isSuperAdmin, selectedCenterId, appState]);

  const handleCenterSelect = (centerId: string, centerName: string) => {
    setSelectedCenterId(centerId);
    setSelectedCenterName(centerName);
    setAppState("login");
  };

  const handleLogin = () => {
    setAppState("dashboard");
  };

  const handleBackToCenter = () => {
    setAppState("centerSelection");
    setSelectedCenterId(null);
    setSelectedCenterName("");
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
          centerName={selectedCenterName}
          centerId={selectedCenterId || ""}
        />
      )}
      {appState === "dashboard" && <DashboardScreen />}
    </div>
  );
};

export default Index;
