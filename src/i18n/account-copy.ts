import type { Locale } from './config'

export function accountCopy(locale: Locale) {
  return locale === 'ar' ? {
    displayName: 'اسم العرض', displayNameHint: 'يظهر هذا الاسم في ملفك الشخصي وحسابك.',
    displayNameInvalid: 'أدخل اسمًا من حرفين إلى ٨٠ حرفًا يتضمن حرفًا أو رقمًا.',
    saveName: 'حفظ اسم العرض', saveUsername: 'حفظ اسم المستخدم',
    usernameHint: 'معرّف فريد لحسابك، منفصل عن اسم العرض.',
    profile: 'ملفي الشخصي', learner: 'متعلّم TestCraft', edit: 'تعديل الملف الشخصي',
    overview: 'نظرة على تعلّمك', lessons: 'الدروس المكتملة', paths: 'مسارات فيها تقدّم مسجّل',
    badges: 'الشارات المكتسبة', xp: 'نقاط الخبرة', history: 'سجل التعلّم',
    reports: 'تقاريري وملاحظات المراجعة', activity: 'سجل النشاط', workspace: 'متابعة الدروس في الأكاديمية',
    badgeHint: 'تظهر شاراتك هنا بعد أن تحقّق شروطها أثناء التعلّم.',
  } : {
    displayName: 'Display name', displayNameHint: 'This name appears on your profile and account.',
    displayNameInvalid: 'Enter 2 to 80 characters, including at least one letter or number.',
    saveName: 'Save display name', saveUsername: 'Save username',
    usernameHint: 'Your unique account handle is separate from your display name.',
    profile: 'My Profile', learner: 'TestCraft learner', edit: 'Edit Profile',
    overview: 'Learning overview', lessons: 'Completed lessons', paths: 'Paths with recorded progress',
    badges: 'Earned badges', xp: 'Experience points', history: 'Learning history',
    reports: 'My reports and review feedback', activity: 'Activity history', workspace: 'Open the Academy workspace',
    badgeHint: 'Your badges will appear here when you meet their requirements as you learn.',
  }
}
