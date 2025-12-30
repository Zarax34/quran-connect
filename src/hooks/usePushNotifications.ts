import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PushToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
  device_id?: string;
}

export const usePushNotifications = (userId: string | undefined) => {
  const [isRegistered, setIsRegistered] = useState(false);

  // Save push token to database
  const savePushToken = useCallback(async (tokenData: PushToken) => {
    if (!userId) return false;

    try {
      // Check if token already exists
      const { data: existingToken } = await supabase
        .from('push_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('token', tokenData.token)
        .maybeSingle();

      if (existingToken) {
        // Update existing token to active
        const { error } = await supabase
          .from('push_tokens')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', existingToken.id);

        if (error) throw error;
        console.log('Push token updated successfully');
      } else {
        // Insert new token
        const { error } = await supabase
          .from('push_tokens')
          .insert({
            user_id: userId,
            token: tokenData.token,
            platform: tokenData.platform,
            device_id: tokenData.device_id,
            is_active: true
          });

        if (error) throw error;
        console.log('Push token saved successfully');
      }

      setIsRegistered(true);
      return true;
    } catch (error) {
      console.error('Error saving push token:', error);
      return false;
    }
  }, [userId]);

  // Remove push token from database
  const removePushToken = useCallback(async (token: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('token', token);

      if (error) throw error;
      setIsRegistered(false);
      return true;
    } catch (error) {
      console.error('Error removing push token:', error);
      return false;
    }
  }, [userId]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  // Register for push notifications (for native apps via Capacitor)
  const registerForPushNotifications = useCallback(async () => {
    const permissionGranted = await requestPermission();
    
    if (permissionGranted) {
      console.log('Push notifications permission granted');
      
      // For web, we use a placeholder token
      // In Capacitor native apps, this would be replaced with actual FCM token
      const webToken: PushToken = {
        token: `web-${userId}-${Date.now()}`,
        platform: 'web'
      };
      
      await savePushToken(webToken);
    }
    
    return permissionGranted;
  }, [requestPermission, savePushToken, userId]);

  // Subscribe to realtime notifications for in-app display
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification = payload.new as any;
          
          // Show browser notification if permission is granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.content,
              icon: '/favicon.ico',
              tag: notification.id,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    isRegistered,
    requestPermission,
    registerForPushNotifications,
    savePushToken,
    removePushToken
  };
};
