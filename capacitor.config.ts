import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c3f695086147482e8fb29fb233c58185',
  appName: 'مراكز تحفيظ القرآن',
  webDir: 'dist',
  server: {
    url: 'https://c3f69508-6147-482e-8fb2-9fb233c58185.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
