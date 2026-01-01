# مراكز تحفيظ القرآن

نظام متكامل لإدارة مراكز تحفيظ القرآن الكريم

## المميزات

- إدارة المراكز والحلقات
- متابعة تقدم الطلاب
- تقارير يومية للحفظ والمراجعة
- إشعارات فورية لأولياء الأمور
- دعم تعدد الأدوار (مدير، معلم، ولي أمر، طالب)

## تشغيل المشروع محلياً

```bash
npm install
npm run dev
```

## بناء تطبيق الموبايل

### ⚠️ ما يجب تغييره قبل البناء

قبل بناء التطبيق للموبايل، تأكد من تغيير الإعدادات التالية:

#### 1. ملف `capacitor.config.ts`

```typescript
const config: CapacitorConfig = {
  appId: 'com.yourcompany.yourapp', // غيّر هذا لمعرف التطبيق الخاص بك
  appName: 'اسم تطبيقك',            // غيّر هذا لاسم تطبيقك
  // ...
};
```

#### 2. ملف `index.html`

```html
<title>اسم تطبيقك</title>
<meta name="description" content="وصف تطبيقك" />
```

#### 3. أيقونات التطبيق

- ضع أيقونة التطبيق في المسارات التالية بعد إضافة منصات الموبايل:
  - Android: `android/app/src/main/res/`
  - iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

#### 4. صور Splash Screen

- Android: `android/app/src/main/res/drawable/`
- iOS: `ios/App/App/Assets.xcassets/Splash.imageset/`

#### 5. إعدادات Firebase (للإشعارات)

1. أنشئ مشروع في [Firebase Console](https://console.firebase.google.com)
2. أضف تطبيقات Android و iOS
3. حمّل ملفات التكوين:
   - Android: `google-services.json` → `android/app/`
   - iOS: `GoogleService-Info.plist` → `ios/App/App/`
4. أضف `FIREBASE_SERVICE_ACCOUNT` في Supabase Edge Functions secrets

#### 6. Signing Keys (للنشر)

- **Android**: أنشئ keystore للتوقيع
  ```bash
  keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
  ```
- **iOS**: أنشئ Provisioning Profile و Certificates في Apple Developer Portal

### Android (APK)

1. تأكد من تثبيت Android Studio
2. قم بتشغيل الأوامر التالية:

```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

3. في Android Studio، اختر Build > Generate Signed Bundle / APK

### iOS

1. تأكد من استخدام Mac مع Xcode
2. قم بتشغيل الأوامر التالية:

```bash
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

3. في Xcode، اختر Product > Archive

## التقنيات المستخدمة

- React + TypeScript
- Tailwind CSS
- Supabase (قاعدة البيانات والمصادقة)
- Capacitor (تطبيقات الموبايل)
- Firebase Cloud Messaging (الإشعارات)

## بنية المشروع

```
src/
├── components/          # مكونات React
│   ├── admin/          # مكونات لوحة الإدارة
│   ├── teacher/        # مكونات المعلم
│   ├── parent/         # مكونات ولي الأمر
│   ├── student/        # مكونات الطالب
│   └── ui/             # مكونات واجهة المستخدم
├── contexts/           # React Contexts
├── hooks/              # Custom Hooks
├── integrations/       # تكاملات خارجية
└── pages/              # صفحات التطبيق

supabase/
├── functions/          # Edge Functions
└── migrations/         # هجرات قاعدة البيانات
```
