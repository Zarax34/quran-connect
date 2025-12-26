import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a fake email from username for Supabase auth
function generateEmail(username: string): string {
  // Remove spaces and special characters, convert to lowercase
  const sanitized = username
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "");
  const timestamp = Date.now();
  return `${sanitized}_${timestamp}@quran.local`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, username, password, fullName, role, centerId } = await req.json();

    // Use email if provided, otherwise generate from username or fullName
    const userEmail = email || generateEmail(username || fullName);
    
    console.log("Creating user:", userEmail, "with role:", role);

    // Create user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const userId = authData.user.id;
    console.log("User created with ID:", userId);

    // Create profile (trigger should handle this, but just in case)
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        full_name: fullName,
        email: email || null, // Only store real email if provided
      });

    if (profileError) {
      console.error("Profile error:", profileError);
    }

    // Create role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role: role,
        center_id: centerId || null, // null for super_admin
      });

    if (roleError) {
      console.error("Role error:", roleError);
      return new Response(
        JSON.stringify({ error: roleError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("User setup complete:", fullName);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        message: "User created successfully" 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
