import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate email using random ID (no Arabic characters)
function generateEmail(type: string): string {
  const randomId = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now();
  return `${type}_${randomId}_${timestamp}@app.local`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { 
      studentName, 
      studentPhone, 
      studentBirthDate,
      halqaId,
      centerId,
      parentName, 
      parentPhone,
      parentWork,
      relationship 
    } = await req.json();

    console.log("Creating student with parent:", { studentName, parentName });

    // Validate required fields
    if (!studentName || !parentName || !parentPhone || !centerId) {
      return new Response(
        JSON.stringify({ error: "يرجى ملء جميع الحقول المطلوبة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine passwords
    const parentPassword = parentPhone;
    const studentPassword = studentPhone || parentPhone; // Use parent phone if student has no phone

    // 1. Create parent user account
    const parentEmail = generateEmail('parent');
    console.log("Creating parent account:", parentEmail);

    const { data: parentAuthData, error: parentAuthError } = await supabase.auth.admin.createUser({
      email: parentEmail,
      password: parentPassword,
      email_confirm: true,
      user_metadata: {
        full_name: parentName,
        username: parentName,
      },
    });

    if (parentAuthError) {
      console.error("Parent auth error:", parentAuthError);
      return new Response(
        JSON.stringify({ error: `خطأ في إنشاء حساب ولي الأمر: ${parentAuthError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parentUserId = parentAuthData.user.id;
    console.log("Parent user created:", parentUserId);

    // 2. Create parent profile
    await supabase.from("profiles").upsert({
      id: parentUserId,
      full_name: parentName,
      phone: parentPhone,
    });

    // 3. Add parent role
    await supabase.from("user_roles").insert({
      user_id: parentUserId,
      role: "parent",
      center_id: centerId,
    });

    // 4. Create parent record
    const { data: parentData, error: parentError } = await supabase
      .from("parents")
      .insert({
        full_name: parentName,
        phone: parentPhone,
        work: parentWork || null,
        user_id: parentUserId,
      })
      .select()
      .single();

    if (parentError) {
      console.error("Parent record error:", parentError);
      return new Response(
        JSON.stringify({ error: `خطأ في إنشاء سجل ولي الأمر: ${parentError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Parent record created:", parentData.id);

    // 5. Create student user account
    const studentEmail = generateEmail('student');
    console.log("Creating student account:", studentEmail);

    const { data: studentAuthData, error: studentAuthError } = await supabase.auth.admin.createUser({
      email: studentEmail,
      password: studentPassword,
      email_confirm: true,
      user_metadata: {
        full_name: studentName,
        username: studentName,
      },
    });

    if (studentAuthError) {
      console.error("Student auth error:", studentAuthError);
      return new Response(
        JSON.stringify({ error: `خطأ في إنشاء حساب الطالب: ${studentAuthError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const studentUserId = studentAuthData.user.id;
    console.log("Student user created:", studentUserId);

    // 6. Create student profile
    await supabase.from("profiles").upsert({
      id: studentUserId,
      full_name: studentName,
      phone: studentPhone || null,
    });

    // 7. Add student role
    await supabase.from("user_roles").insert({
      user_id: studentUserId,
      role: "student",
      center_id: centerId,
    });

    // 8. Create student record
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .insert({
        full_name: studentName,
        phone: studentPhone || null,
        birth_date: studentBirthDate || null,
        halqa_id: halqaId || null,
        center_id: centerId,
        user_id: studentUserId,
      })
      .select()
      .single();

    if (studentError) {
      console.error("Student record error:", studentError);
      return new Response(
        JSON.stringify({ error: `خطأ في إنشاء سجل الطالب: ${studentError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Student record created:", studentData.id);

    // 9. Link student to parent
    const { error: linkError } = await supabase
      .from("student_parents")
      .insert({
        student_id: studentData.id,
        parent_id: parentData.id,
        relationship: relationship || "أب",
      });

    if (linkError) {
      console.error("Link error:", linkError);
    }

    console.log("Student and parent created successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        studentId: studentData.id,
        parentId: parentData.id,
        studentUserId,
        parentUserId,
        credentials: {
          student: {
            username: studentName,
            password: studentPassword,
          },
          parent: {
            username: parentName,
            password: parentPassword,
          }
        },
        message: "تم إنشاء حساب الطالب وولي الأمر بنجاح" 
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
