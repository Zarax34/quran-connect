import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Use service role to look up email
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { identifier, password, centerId } = await req.json();

    console.log("Login attempt for:", identifier, "at center:", centerId);

    if (!identifier || !password) {
      return new Response(
        JSON.stringify({ error: "يرجى إدخال اسم المستخدم وكلمة المرور" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedIdentifier = identifier.trim();
    
    // Check if identifier is an email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let email = trimmedIdentifier;
    let userId: string | null = null;

    if (!emailRegex.test(trimmedIdentifier)) {
      // Search for profiles by name
      const { data: profilesByName } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name")
        .ilike("full_name", trimmedIdentifier);

      console.log("Found profiles by name:", profilesByName?.length);

      // Filter to exact match (trimmed)
      const matchedProfiles = profilesByName?.filter(p => 
        p.full_name?.trim() === trimmedIdentifier
      ) || [];

      console.log("Exact matched profiles:", matchedProfiles.length);

      if (matchedProfiles.length === 0) {
        console.log("No profile found for:", trimmedIdentifier);
        return new Response(
          JSON.stringify({ error: "اسم المستخدم غير موجود" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If centerId is provided, find the user who belongs to this center
      let matchedProfile = null;
      
      if (centerId && matchedProfiles.length > 1) {
        // Get user roles to find which profile belongs to this center
        for (const profile of matchedProfiles) {
          const { data: roles } = await supabaseAdmin
            .from("user_roles")
            .select("role, center_id")
            .eq("user_id", profile.id);
          
          const isSuperAdmin = roles?.some(r => r.role === "super_admin");
          const belongsToCenter = roles?.some(r => r.center_id === centerId);
          
          if (isSuperAdmin || belongsToCenter) {
            matchedProfile = profile;
            console.log("Found user belonging to center:", profile.id);
            break;
          }
        }
        
        if (!matchedProfile) {
          console.log("No user with this name belongs to center:", centerId);
          return new Response(
            JSON.stringify({ error: "هذا الحساب غير مسجل في هذا المركز" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        matchedProfile = matchedProfiles[0];
      }

      userId = matchedProfile.id;

      if (matchedProfile.email) {
        email = matchedProfile.email;
        console.log("Found email in profile:", email);
      } else {
        // Get email from auth.users
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(matchedProfile.id);
        
        if (authError || !authUser?.user?.email) {
          console.error("Error getting auth user:", authError);
          return new Response(
            JSON.stringify({ error: "خطأ في استرجاع بيانات المستخدم" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        email = authUser.user.email;
        console.log("Found email from auth user:", email);
      }
    } else {
      // Email login - find user by email
      const { data: profileByEmail } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      
      if (profileByEmail) {
        userId = profileByEmail.id;
      } else {
        // Try to find by auth user email
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const authUser = users?.users?.find(u => u.email === email);
        if (authUser) {
          userId = authUser.id;
        }
      }
    }

    // Check if user belongs to the selected center (if centerId is provided and not already verified)
    if (centerId && userId) {
      const { data: userRoles } = await supabaseAdmin
        .from("user_roles")
        .select("role, center_id")
        .eq("user_id", userId);

      console.log("User roles:", userRoles);

      if (userRoles && userRoles.length > 0) {
        // Check if user is super_admin (can access any center)
        const isSuperAdmin = userRoles.some(r => r.role === "super_admin");
        
        if (!isSuperAdmin) {
          // Check if user has a role in the selected center
          const hasAccessToCenter = userRoles.some(r => r.center_id === centerId);
          
          if (!hasAccessToCenter) {
            console.log("User does not have access to center:", centerId);
            return new Response(
              JSON.stringify({ error: "هذا الحساب غير مسجل في هذا المركز" }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } else {
        console.log("No roles found for user");
        return new Response(
          JSON.stringify({ error: "هذا الحساب غير مسجل في أي مركز" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Now sign in with the email using anon client
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Auth error:", error.message);
      return new Response(
        JSON.stringify({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Login successful for:", identifier);

    return new Response(
      JSON.stringify({ 
        success: true,
        session: data.session,
        user: data.user,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
