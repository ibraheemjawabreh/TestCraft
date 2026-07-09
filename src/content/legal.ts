import { siteConfig } from '@/config/site'
import type { Locale } from '@/i18n/config'

export interface LegalSection {
  id: string
  title: string
  body: string[]
}

export interface LegalDocument {
  updatedAt: string
  sections: LegalSection[]
  disclaimer: string
}

export type LegalDocumentKind = 'privacy' | 'terms'

export const legalContent: Record<Locale, Record<LegalDocumentKind, LegalDocument>> = {
  en: {
    privacy: {
      updatedAt: 'July 9, 2026',
      sections: [
        {
          id: 'introduction',
          title: 'Introduction',
          body: [
            `${siteConfig.name} is a QA learning platform that helps learners practice lessons, challenges, bug reports, and feedback workflows.`,
            'This Privacy Policy explains the general types of information the MVP version may collect and how that information is used to operate the platform.',
          ],
        },
        {
          id: 'information-we-collect',
          title: 'Information We Collect',
          body: [
            'We collect information needed to create accounts, track learning progress, review submissions, and improve the tester learning experience.',
          ],
        },
        {
          id: 'account-information',
          title: 'Account Information',
          body: [
            'Users may sign in using Google or email and password. Authentication is handled through Supabase.',
            'Profile data may include username, avatar, role, XP, level, and account timestamps.',
          ],
        },
        {
          id: 'learning-activity',
          title: 'Learning Activity',
          body: [
            `${siteConfig.name} stores learning activity such as completed lessons, active challenges, progress, XP, badges, reports, and AI or admin review results.`,
          ],
        },
        {
          id: 'uploaded-content',
          title: 'Uploaded Content',
          body: [
            'Uploaded avatars are stored in Supabase Storage. Bug report submissions and other learner content are stored so the platform can provide feedback and progress tracking.',
          ],
        },
        {
          id: 'how-we-use-information',
          title: 'How We Use Information',
          body: [
            'Information is used to provide authentication, personalize the academy, evaluate submitted work, show progress, maintain security, and support platform improvements.',
          ],
        },
        {
          id: 'authentication-and-security',
          title: 'Authentication and Security',
          body: [
            'Supabase provides the authentication layer for Google and email/password sign-in. The platform uses role-based access patterns to separate tester and admin experiences.',
          ],
        },
        {
          id: 'third-party-services',
          title: 'Third-Party Services',
          body: [
            `${siteConfig.name} uses third-party services such as Supabase for authentication, database, and storage features. Google sign-in is available when users choose that option.`,
          ],
        },
        {
          id: 'data-storage',
          title: 'Data Storage',
          body: [
            'Account, profile, progress, report, evaluation, and avatar data are stored using the application database and Supabase Storage.',
          ],
        },
        {
          id: 'user-choices',
          title: 'User Choices',
          body: [
            'Users can update supported profile and preference information from the settings page. Some account fields may be managed by the authentication provider.',
          ],
        },
        {
          id: 'contact',
          title: 'Contact',
          body: [
            `For privacy questions about ${siteConfig.name}, contact ${siteConfig.creator.name} at ${siteConfig.creator.email}.`,
          ],
        },
        {
          id: 'updates-to-this-policy',
          title: 'Updates to This Policy',
          body: [
            'This policy may be updated as the platform changes. The updated date on this page should be reviewed when changes are made.',
          ],
        },
      ],
      disclaimer:
        `This policy is provided as a general template for the MVP version of ${siteConfig.name} and should be reviewed before production launch.`,
    },
    terms: {
      updatedAt: 'July 9, 2026',
      sections: [
        {
          id: 'introduction',
          title: 'Introduction',
          body: [
            `${siteConfig.name} is a QA learning platform for lessons, practical challenges, bug report submissions, and learning feedback.`,
            'These Terms describe general expectations for using the MVP version of the platform.',
          ],
        },
        {
          id: 'use-of-the-platform',
          title: 'Use of the Platform',
          body: [
            'Users should use the platform for learning, practicing QA skills, submitting bug reports, and reviewing feedback in a responsible way.',
          ],
        },
        {
          id: 'user-accounts',
          title: 'User Accounts',
          body: [
            'Users are responsible for keeping their account access secure. Accounts may use Google sign-in or email/password authentication through Supabase.',
          ],
        },
        {
          id: 'learning-content',
          title: 'Learning Content',
          body: [
            'Lessons, challenges, examples, and platform materials are provided for educational purposes and may change as the academy improves.',
          ],
        },
        {
          id: 'user-submissions',
          title: 'User Submissions',
          body: [
            'Users may submit bug reports and related learning content. Submissions should be accurate, respectful, and relevant to the challenge.',
          ],
        },
        {
          id: 'acceptable-use',
          title: 'Acceptable Use',
          body: [
            'Users should not submit harmful, illegal, abusive, misleading, or disruptive content. The platform should not be used to attack, overload, or misuse systems.',
          ],
        },
        {
          id: 'ai-feedback',
          title: 'AI Feedback',
          body: [
            'AI feedback is educational and may not always be perfect. Users should treat it as learning guidance, not as a final professional judgment.',
          ],
        },
        {
          id: 'certificates-and-progress',
          title: 'Certificates and Progress',
          body: [
            'Progress, XP, levels, badges, and certificates are part of the learning system. They do not guarantee employment, external certification recognition, or job outcomes.',
          ],
        },
        {
          id: 'availability',
          title: 'Availability',
          body: [
            'The MVP platform may change, pause, or experience interruptions while features are developed and improved.',
          ],
        },
        {
          id: 'limitation-of-responsibility',
          title: 'Limitation of Responsibility',
          body: [
            `${siteConfig.name} is provided as a learning platform. Users are responsible for how they apply what they learn and for reviewing important decisions independently.`,
          ],
        },
        {
          id: 'changes-to-the-platform',
          title: 'Changes to the Platform',
          body: [
            'Features, content, routes, learning rules, XP systems, and review flows may change as the product evolves.',
          ],
        },
        {
          id: 'contact',
          title: 'Contact',
          body: [
            `For questions about these Terms, contact ${siteConfig.creator.name} at ${siteConfig.creator.email}.`,
          ],
        },
      ],
      disclaimer:
        `These terms are provided as a general template for the MVP version of ${siteConfig.name} and should be reviewed before production launch.`,
    },
  },
  ar: {
    privacy: {
      updatedAt: '9 يوليو 2026',
      sections: [
        {
          id: 'introduction',
          title: 'مقدمة',
          body: [
            `${siteConfig.name} منصة تعليمية في ضمان الجودة تساعد المتعلمين على التدريب من خلال الدروس، والتحديات، وتقارير الأخطاء، ومسارات التغذية الراجعة.`,
            'توضح سياسة الخصوصية هذه بشكل عام أنواع المعلومات التي قد تجمعها نسخة MVP وكيفية استخدامها لتشغيل المنصة.',
          ],
        },
        {
          id: 'information-we-collect',
          title: 'المعلومات التي نجمعها',
          body: [
            'نجمع المعلومات اللازمة لإنشاء الحسابات، وتتبع تقدم التعلم، ومراجعة المشاركات، وتحسين تجربة تعلم المختبرين.',
          ],
        },
        {
          id: 'account-information',
          title: 'معلومات الحساب',
          body: [
            'يمكن للمستخدمين تسجيل الدخول باستخدام Google أو البريد الإلكتروني وكلمة المرور. تتم المصادقة من خلال Supabase.',
            'قد تتضمن بيانات الملف الشخصي اسم المستخدم، والصورة الرمزية، والدور، ونقاط XP، والمستوى، وتواريخ الحساب.',
          ],
        },
        {
          id: 'learning-activity',
          title: 'نشاط التعلم',
          body: [
            `تخزن ${siteConfig.name} نشاط التعلم مثل الدروس المكتملة، والتحديات النشطة، والتقدم، ونقاط XP، والشارات، والتقارير، ونتائج مراجعة الذكاء الاصطناعي أو الإدارة.`,
          ],
        },
        {
          id: 'uploaded-content',
          title: 'المحتوى المرفوع',
          body: [
            'تخزن الصور الرمزية المرفوعة في Supabase Storage. كما تخزن تقارير الأخطاء ومحتوى التعلم الآخر لتقديم الملاحظات وتتبع التقدم.',
          ],
        },
        {
          id: 'how-we-use-information',
          title: 'كيف نستخدم المعلومات',
          body: [
            'تستخدم المعلومات لتوفير المصادقة، وتخصيص الأكاديمية، وتقييم المشاركات، وعرض التقدم، والحفاظ على الأمان، ودعم تحسينات المنصة.',
          ],
        },
        {
          id: 'authentication-and-security',
          title: 'المصادقة والأمان',
          body: [
            'توفر Supabase طبقة المصادقة لتسجيل الدخول عبر Google أو البريد الإلكتروني وكلمة المرور. تستخدم المنصة أنماط وصول مبنية على الأدوار للفصل بين تجربة المختبر وتجربة الإدارة.',
          ],
        },
        {
          id: 'third-party-services',
          title: 'خدمات الطرف الثالث',
          body: [
            `تستخدم ${siteConfig.name} خدمات طرف ثالث مثل Supabase للمصادقة وقاعدة البيانات والتخزين. يتوفر تسجيل الدخول عبر Google عندما يختار المستخدم ذلك.`,
          ],
        },
        {
          id: 'data-storage',
          title: 'تخزين البيانات',
          body: [
            'تخزن بيانات الحساب والملف الشخصي والتقدم والتقارير والتقييمات والصور الرمزية باستخدام قاعدة بيانات التطبيق وSupabase Storage.',
          ],
        },
        {
          id: 'user-choices',
          title: 'خيارات المستخدم',
          body: [
            'يمكن للمستخدمين تحديث معلومات الملف الشخصي والتفضيلات المدعومة من صفحة الإعدادات. قد تدار بعض حقول الحساب من خلال مزود المصادقة.',
          ],
        },
        {
          id: 'contact',
          title: 'التواصل',
          body: [
            `لأي أسئلة حول الخصوصية في ${siteConfig.name}، تواصل مع ${siteConfig.creator.name} عبر ${siteConfig.creator.email}.`,
          ],
        },
        {
          id: 'updates-to-this-policy',
          title: 'تحديثات السياسة',
          body: [
            'قد يتم تحديث هذه السياسة عند تغير المنصة. ينبغي مراجعة تاريخ آخر تحديث في هذه الصفحة عند إجراء أي تغييرات.',
          ],
        },
      ],
      disclaimer:
        `تم توفير هذه السياسة كنموذج عام لنسخة MVP من ${siteConfig.name}، وينصح بمراجعتها قبل الإطلاق الرسمي.`,
    },
    terms: {
      updatedAt: '9 يوليو 2026',
      sections: [
        {
          id: 'introduction',
          title: 'مقدمة',
          body: [
            `${siteConfig.name} منصة تعلم لضمان الجودة تقدم دروسا، وتحديات عملية، وإرسال تقارير أخطاء، وملاحظات تعليمية.`,
            'توضح هذه الشروط التوقعات العامة لاستخدام نسخة MVP من المنصة.',
          ],
        },
        {
          id: 'use-of-the-platform',
          title: 'استخدام المنصة',
          body: [
            'ينبغي استخدام المنصة للتعلم، وممارسة مهارات ضمان الجودة، وإرسال تقارير الأخطاء، ومراجعة الملاحظات بطريقة مسؤولة.',
          ],
        },
        {
          id: 'user-accounts',
          title: 'حسابات المستخدمين',
          body: [
            'يتحمل المستخدم مسؤولية الحفاظ على أمان الوصول إلى حسابه. يمكن للحسابات استخدام تسجيل الدخول عبر Google أو البريد الإلكتروني وكلمة المرور من خلال Supabase.',
          ],
        },
        {
          id: 'learning-content',
          title: 'المحتوى التعليمي',
          body: [
            'تقدم الدروس والتحديات والأمثلة ومواد المنصة لأغراض تعليمية، وقد تتغير مع تحسين الأكاديمية.',
          ],
        },
        {
          id: 'user-submissions',
          title: 'مشاركات المستخدمين',
          body: [
            'يمكن للمستخدمين إرسال تقارير أخطاء ومحتوى تعلم ذي صلة. ينبغي أن تكون المشاركات دقيقة ومحترمة ومرتبطة بالتحدي.',
          ],
        },
        {
          id: 'acceptable-use',
          title: 'الاستخدام المقبول',
          body: [
            'ينبغي ألا يرسل المستخدمون محتوى ضارا أو غير قانوني أو مسيئا أو مضللا أو معطلا. يجب عدم استخدام المنصة لمهاجمة الأنظمة أو إساءة استخدامها أو الضغط عليها.',
          ],
        },
        {
          id: 'ai-feedback',
          title: 'ملاحظات الذكاء الاصطناعي',
          body: [
            'ملاحظات الذكاء الاصطناعي تعليمية وقد لا تكون مثالية دائما. ينبغي التعامل معها كإرشاد للتعلم وليس كحكم مهني نهائي.',
          ],
        },
        {
          id: 'certificates-and-progress',
          title: 'الشهادات والتقدم',
          body: [
            'التقدم ونقاط XP والمستويات والشارات والشهادات جزء من نظام التعلم. وهي لا تضمن التوظيف أو الاعتراف الخارجي بالشهادات أو نتائج وظيفية محددة.',
          ],
        },
        {
          id: 'availability',
          title: 'توفر الخدمة',
          body: [
            'قد تتغير منصة MVP أو تتوقف مؤقتا أو تواجه انقطاعات أثناء تطوير الميزات وتحسينها.',
          ],
        },
        {
          id: 'limitation-of-responsibility',
          title: 'حدود المسؤولية',
          body: [
            `توفر ${siteConfig.name} كمنصة تعليمية. يتحمل المستخدمون مسؤولية كيفية تطبيق ما يتعلمونه ومراجعة القرارات المهمة بشكل مستقل.`,
          ],
        },
        {
          id: 'changes-to-the-platform',
          title: 'التغييرات على المنصة',
          body: [
            'قد تتغير الميزات والمحتوى والمسارات وقواعد التعلم وأنظمة XP وتدفقات المراجعة مع تطور المنتج.',
          ],
        },
        {
          id: 'contact',
          title: 'التواصل',
          body: [
            `لأي أسئلة حول هذه الشروط، تواصل مع ${siteConfig.creator.name} عبر ${siteConfig.creator.email}.`,
          ],
        },
      ],
      disclaimer:
        `تم توفير هذه الشروط كنموذج عام لنسخة MVP من ${siteConfig.name}، وينصح بمراجعتها قبل الإطلاق الرسمي.`,
    },
  },
}
