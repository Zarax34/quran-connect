import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "super_admin" | "center_admin" | "teacher" | "communication_officer" | "parent" | "student";

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  center_id: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  selectedCenterId: string | null;
  setSelectedCenterId: (centerId: string | null) => void;
  isLoading: boolean;
  isSuperAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  canAccessCenter: (centerId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isSuperAdmin = roles.some((r) => r.role === "super_admin");

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      
      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Fetch roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId);
      
      if (rolesData) {
        setRoles(rolesData as UserRole[]);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer fetching to avoid deadlock
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (identifier: string, password: string) => {
    // Check if identifier is an email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let email = identifier;
    
    if (!emailRegex.test(identifier)) {
      // Not an email, look up by name in profiles table
      const { data: profileData } = await supabase
        .from("profiles")
        .select("email")
        .eq("full_name", identifier.trim())
        .maybeSingle();
      
      if (profileData?.email) {
        email = profileData.email;
      } else {
        // Fallback to old format for backward compatibility
        email = `${identifier}@app.local`;
      }
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setSelectedCenterId(null);
  };

  const hasRole = (role: AppRole): boolean => {
    return roles.some((r) => r.role === role);
  };

  const canAccessCenter = (centerId: string): boolean => {
    if (isSuperAdmin) return true;
    return roles.some((r) => r.center_id === centerId);
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    roles,
    selectedCenterId,
    setSelectedCenterId,
    isLoading,
    isSuperAdmin,
    signIn,
    signOut,
    hasRole,
    canAccessCenter,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
