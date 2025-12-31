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
  priority?: 'normal' | 'emergency';
}

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

// Generate JWT for Google OAuth2
async function createJWT(serviceAccount: ServiceAccount): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key and sign
  const privateKeyPem = serviceAccount.private_key;
  const pemContents = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${unsignedToken}.${signatureB64}`;
}

// Get OAuth2 access token
async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const jwt = await createJWT(serviceAccount);

  const response = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to get access token:', error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');

    if (!serviceAccountJson) {
      console.error('FIREBASE_SERVICE_ACCOUNT not configured');
      return new Response(
        JSON.stringify({ error: 'Firebase service account not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJson);
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

    // Get OAuth2 access token
    const accessToken = await getAccessToken(serviceAccount);
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

    // Determine if this is an emergency notification
    const isEmergency = payload.priority === 'emergency';
    
    // Send notifications via FCM v1 API
    const fcmResults = await Promise.allSettled(
      tokens.map(async ({ token, platform }) => {
        const fcmPayload = {
          message: {
            token: token,
            notification: {
              title: isEmergency ? `🚨 ${payload.title}` : payload.title,
              body: payload.body,
            },
            data: { 
              ...(payload.data || {}),
              priority: isEmergency ? 'emergency' : 'normal',
            },
            android: {
              priority: 'high',
              notification: {
                sound: isEmergency ? 'emergency_alarm' : 'default',
                channel_id: isEmergency ? 'emergency_notifications' : 'default_notifications',
                default_sound: !isEmergency,
                default_vibrate_timings: !isEmergency,
                vibrate_timings: isEmergency ? ['0s', '0.5s', '0.25s', '0.5s', '0.25s', '0.5s'] : undefined,
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: isEmergency ? 'emergency_alarm.caf' : 'default',
                  badge: 1,
                  'interruption-level': isEmergency ? 'critical' : 'active',
                },
              },
            },
            webpush: {
              notification: {
                icon: '/favicon.ico',
                vibrate: isEmergency ? [500, 250, 500, 250, 500] : [200],
                requireInteraction: isEmergency,
                tag: isEmergency ? 'emergency' : 'notification',
              },
              headers: {
                Urgency: isEmergency ? 'high' : 'normal',
              },
            },
          },
        };

        console.log(`Sending FCM v1 notification to ${platform} device`);

        const response = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(fcmPayload),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('FCM v1 send error:', result);
          
          // Check for invalid token errors
          if (result.error?.details?.some((d: any) => 
            d.errorCode === 'UNREGISTERED' || d.errorCode === 'INVALID_ARGUMENT'
          )) {
            console.log(`Deactivating invalid token: ${token.substring(0, 20)}...`);
            await supabase
              .from('push_tokens')
              .update({ is_active: false })
              .eq('token', token);
          }
          
          throw new Error(`FCM error: ${JSON.stringify(result)}`);
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
