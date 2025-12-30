import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationPayload {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY');

    if (!firebaseServerKey) {
      console.error('FIREBASE_SERVER_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Firebase server key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: PushNotificationPayload = await req.json();

    console.log('Received push notification request:', JSON.stringify(payload));

    // Get user IDs to send notifications to
    let userIds: string[] = [];
    if (payload.user_id) {
      userIds = [payload.user_id];
    } else if (payload.user_ids && payload.user_ids.length > 0) {
      userIds = payload.user_ids;
    } else {
      return new Response(
        JSON.stringify({ error: 'No user_id or user_ids provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch push tokens for the specified users
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log('No active push tokens found for users:', userIds);
      return new Response(
        JSON.stringify({ message: 'No active push tokens found', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${tokens.length} push tokens to notify`);

    // Send notifications via FCM
    const fcmResults = await Promise.allSettled(
      tokens.map(async ({ token, platform }) => {
        const fcmPayload = {
          to: token,
          notification: {
            title: payload.title,
            body: payload.body,
            sound: 'default',
            badge: 1,
          },
          data: payload.data || {},
          priority: 'high',
        };

        console.log(`Sending FCM notification to ${platform} device`);

        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${firebaseServerKey}`,
          },
          body: JSON.stringify(fcmPayload),
        });

        const result = await response.json();
        
        if (!response.ok) {
          console.error('FCM send error:', result);
          throw new Error(`FCM error: ${JSON.stringify(result)}`);
        }

        // Check for invalid tokens and deactivate them
        if (result.failure > 0 && result.results) {
          for (const res of result.results) {
            if (res.error === 'NotRegistered' || res.error === 'InvalidRegistration') {
              console.log(`Deactivating invalid token: ${token.substring(0, 20)}...`);
              await supabase
                .from('push_tokens')
                .update({ is_active: false })
                .eq('token', token);
            }
          }
        }

        return result;
      })
    );

    const successCount = fcmResults.filter(r => r.status === 'fulfilled').length;
    const failureCount = fcmResults.filter(r => r.status === 'rejected').length;

    console.log(`Push notification results: ${successCount} success, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        message: 'Push notifications sent',
        sent: successCount,
        failed: failureCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
