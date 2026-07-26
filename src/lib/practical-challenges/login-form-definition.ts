import type { PracticalAppDefinition } from './types'

export const loginFormDefinition: PracticalAppDefinition = {
  key: 'login_form',
  nameEn: 'Login Form',
  nameAr: 'نموذج تسجيل الدخول',
  descriptionEn: 'A realistic simulated login form for QA training. Tests email validation, password rules, error messaging, and forgot password flow.',
  descriptionAr: 'نموذج تسجيل دخول واقعي محاكى لتدريب ضمان الجودة. يختبر التحقق من البريد الإلكتروني وقواعد كلمة المرور ورسائل الخطأ وتدفق نسيان كلمة المرور.',
  defaultConfig: {
    validEmail: 'qa.tester@testcraft.dev',
    validPassword: 'Test@12345',
  },
  bugPresets: [
    {
      key: 'invalid_email_validation_missing',
      titleEn: 'Invalid email format is not validated',
      titleAr: 'عدم التحقق من صيغة البريد الإلكتروني',
      descriptionEn: 'The email format validation is skipped and the form continues to credential checking with any email format.',
      descriptionAr: 'يتم تخطي التحقق من صيغة البريد الإلكتروني ويستمر النموذج في التحقق من بيانات الاعتماد بأي صيغة بريد.',
      actual_severity: 'Medium',
      bonus_xp: 25,
    },
    {
      key: 'forgot_password_no_action',
      titleEn: 'Forgot Password does not respond',
      titleAr: 'رابط نسيت كلمة المرور لا يستجيب',
      descriptionEn: 'Clicking Forgot Password causes no visible action — no panel, no message, no navigation.',
      descriptionAr: 'النقر على نسيت كلمة المرور لا يؤدي إلى أي إجراء مرئي — لا لوحة ولا رسالة ولا تنقل.',
      actual_severity: 'Low',
      bonus_xp: 15,
    },
    {
      key: 'repeated_submission_allowed',
      titleEn: 'Login allows repeated submissions',
      titleAr: 'نموذج تسجيل الدخول يسمح بالإرسال المتكرر',
      descriptionEn: 'The Login button remains active and accepts repeated clicks during processing instead of being disabled.',
      descriptionAr: 'يظل زر تسجيل الدخول نشطًا ويقبل النقرات المتكررة أثناء المعالجة بدلاً من تعطيله.',
      actual_severity: 'Low',
      bonus_xp: 15,
    },
    {
      key: 'short_password_validation_missing',
      titleEn: 'Very short passwords are not validated',
      titleAr: 'عدم التحقق من كلمات المرور القصيرة جدًا',
      descriptionEn: 'The form skips password minimum length validation and continues to credential checking with any password length.',
      descriptionAr: 'يتخطى النموذج التحقق من الحد الأدنى لطول كلمة المرور ويستمر في التحقق من بيانات الاعتماد بأي طول لكلمة المرور.',
      actual_severity: 'Medium',
      bonus_xp: 25,
    },
  ],
}
