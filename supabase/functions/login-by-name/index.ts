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

    const { identifier, password } = await req.json();

    console.log("Login attempt for:", identifier);

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

    if (!emailRegex.test(trimmedIdentifier)) {
      // Look up email by name using service role (bypasses RLS)
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .not("email", "is", null);

      console.log("Found profiles:", profiles?.length);

      // Find profile with matching name (ignoring trailing/leading spaces)
      const matchedProfile = profiles?.find(p => 
        p.full_name?.trim() === trimmedIdentifier
      );

      if (matchedProfile?.email) {
        email = matchedProfile.email;
        console.log("Found email for user:", email);
      } else {
        console.log("No profile found for:", trimmedIdentifier);
        return new Response(
          JSON.stringify({ error: "اسم المستخدم غير موجود" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
