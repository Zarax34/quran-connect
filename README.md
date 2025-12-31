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
