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
  signIn: (email: string, password: string, centerId?: string) => Promise<{ error: Error | null }>;
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

  const signIn = async (identifier: string, password: string, centerId?: string) => {
    // Always use edge function for center validation
    try {
      const response = await supabase.functions.invoke('login-by-name', {
        body: { identifier, password, centerId }
      });
      
      // supabase.functions.invoke returns { data, error }
      if (response.error) {
        // For non-2xx responses, we need to check the data for the actual error message
        // The data should contain the JSON body from the edge function
        let errorMessage = "خطأ في تسجيل الدخول";
        
        // Check if data has the error message
        if (response.data) {
          if (typeof response.data === 'string') {
            try {
              const parsed = JSON.parse(response.data);
              if (parsed.error) errorMessage = parsed.error;
            } catch {
              errorMessage = response.data;
            }
          } else if (typeof response.data === 'object' && response.data.error) {
            errorMessage = response.data.error;
          }
        }
        
        console.log('Login error message:', errorMessage);
        return { error: new Error(errorMessage) };
      }
      
      // Check if data contains an error field (edge function returned 200 but with error in body)
      if (response.data?.error) {
        return { error: new Error(response.data.error) };
      }
      
      if (response.data?.session) {
        // Set the session manually
        await supabase.auth.setSession({
          access_token: response.data.session.access_token,
          refresh_token: response.data.session.refresh_token,
        });
      }
      
      return { error: null };
    } catch (err: unknown) {
      // Handle network errors or unexpected exceptions
      console.error('Login exception:', err);
      const errorMessage = err instanceof Error ? err.message : "خطأ في تسجيل الدخول";
      return { error: new Error(errorMessage) };
    }
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
