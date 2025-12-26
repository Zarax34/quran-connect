import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PushToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

export const usePushNotifications = (userId: string | undefined) => {
  
  // Save push token to database
  const savePushToken = useCallback(async (tokenData: PushToken) => {
    if (!userId) return false;

    try {
      // For now, we'll store the token in the user's metadata or a separate table
      // This can be enhanced when Capacitor push notifications are fully integrated
      console.log('Push token saved:', tokenData);
      return true;
    } catch (error) {
      console.error('Error saving push token:', error);
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

  // Register for push notifications
  const registerForPushNotifications = useCallback(async () => {
    const permissionGranted = await requestPermission();
    
    if (permissionGranted) {
      // In a Capacitor app, this would use the PushNotifications plugin
      // For web, we can use service workers
      console.log('Push notifications permission granted');
      
      // Placeholder for actual token registration
      const mockToken: PushToken = {
        token: 'web-push-token-placeholder',
        platform: 'web'
      };
      
      await savePushToken(mockToken);
    }
    
    return permissionGranted;
  }, [requestPermission, savePushToken]);

  // Subscribe to realtime notifications
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
              icon: '/favicon.ico'
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
    requestPermission,
    registerForPushNotifications,
    savePushToken
  };
};
