import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'

export interface SeedResult {
  success: boolean
  message: string
  created: {
    paths: number
    modules: number
    lessons: number
    challenges: number
  }
}

export async function seedDemoData(locale: string = 'en'): Promise<SeedResult> {
  await requireAdmin(locale as any)
  const supabase = await createClient()

  let createdPaths = 0
  let createdModules = 0
  let createdLessons = 0
  let createdChallenges = 0

  // 1. Ensure Learning Path "QA Foundations" exists
  const pathSlug = 'qa-foundations'
  let { data: path } = await supabase
    .from('learning_paths')
    .select('id')
    .eq('slug', pathSlug)
    .maybeSingle()

  if (!path) {
    const { data: newPath, error: pathError } = await supabase
      .from('learning_paths')
      .insert({
        title: 'QA Foundations',
        title_en: 'QA Foundations',
        title_ar: 'أساسيات ضمان الجودة',
        description: 'Comprehensive foundational learning path for Quality Assurance engineers.',
        description_en: 'Comprehensive foundational learning path for Quality Assurance engineers.',
        description_ar: 'مسار تعليمي شامل لمبادئ ومفاهيم هندسة ضمان الجودة.',
        slug: pathSlug,
        sort_order: 1,
        is_active: true,
      })
      .select('id')
      .single()

    if (pathError || !newPath) {
      console.error('Failed to seed learning path:', pathError)
      return {
        success: false,
        message: `Failed to create Learning Path: ${pathError?.message || 'Unknown error'}`,
        created: { paths: 0, modules: 0, lessons: 0, challenges: 0 },
      }
    }
    path = newPath
    createdPaths++
  }

  const pathId = path.id

  // 2. Modules specification
  const modulesData = [
    {
      slug: 'intro-to-qa',
      title: 'Introduction to Quality Assurance',
      title_ar: 'مقدمة في ضمان الجودة',
      description: 'Understand software testing basics, quality concepts, and the SDLC.',
      description_ar: 'تعلم أساسيات اختبار البرمجيات ومفاهيم الجودة وتدفق دورة حياة تطوير البرمجيات.',
      sort_order: 1,
      lessons: [
        {
          slug: 'software-testing-fundamentals',
          title: 'Software Testing Fundamentals',
          title_ar: 'أساسيات اختبار البرمجيات',
          summary: 'Learn what software testing is, why it matters, and core testing principles.',
          summary_ar: 'تعلم ماهية اختبار البرمجيات، أهميته، والمبادئ الأساسية للاختبار.',
          content: 'Software testing is the process of evaluating a system to identify gaps, errors, or missing requirements. Testing improves software quality, security, and user experience.\n\nKey Principles:\n1. Testing shows the presence of defects, not their absence.\n2. Exhaustive testing is impossible.\n3. Early testing saves time and costs.\n4. Defect clustering: Most bugs are found in a small number of modules.',
          content_ar: 'اختبار البرمجيات هو عملية فحص وتدقيق النظام للتحقق من تلبيته للمتطلبات وتحديد الثغرات والأخطاء.\n\nالمبادئ الأساسية:\n1. الاختبار يثبت وجود الأخطاء وليس خلو النظام منها.\n2. الاختبار الشامل بنسبة 100% أمر غير ممكن عملياً.\n3. الاختبار المبكر يقلل التكلفة والوقت بشكل كبير.\n4. تكتل العيوب: غالبية الأخطاء تتمركز في أجزاء معينة من الكود.',
          sort_order: 1,
        },
        {
          slug: 'qa-vs-qc',
          title: 'Quality Assurance vs Quality Control',
          title_ar: 'ضمان الجودة مقابل ضبط الجودة',
          summary: 'Differentiate between QA (process-focused) and QC (product-focused).',
          summary_ar: 'التمييز بين ضمان الجودة (التركيز على العمليات) وضبط الجودة (التركيز على المنتج النهائي).',
          content: 'QA (Quality Assurance) focuses on process prevention. It ensures the correct processes are followed to prevent defects.\n\nQC (Quality Control) focuses on product verification. It involves testing the actual software product to find bugs before release.\n\nSummary:\n- QA = Process-oriented & Proactive\n- QC = Product-oriented & Reactive',
          content_ar: 'ضمان الجودة (QA) يركز على العمليات والوقاية من الأخطاء قبل حدوثها.\n\nضبط الجودة (QC) يركز على الكشف عن الأخطاء في المنتج النهائي قبل تسليمه.\n\nباختصار:\n- QA = استباقي ويهتم بالعمليات\n- QC = تفاعلي ويهتم بالمنتج التجريبي',
          sort_order: 2,
        },
        {
          slug: 'sdlc-and-qa',
          title: 'Software Development Life Cycle & QA',
          title_ar: 'دورة حياة تطوير البرمجيات وحصن الجودة',
          summary: 'Explore how QA integrates into Waterfall, Agile, and Scrum workflows.',
          summary_ar: 'استكشاف كيفية دمج مهام ضمان الجودة في منهجيات Agile وScrum وWaterfall.',
          content: 'In modern Agile software development, QA is integrated into every phase:\n\n1. Requirements Analysis: Clarify user stories and acceptance criteria.\n2. Sprint Planning: Estimate QA efforts and test boundaries.\n3. In-Sprint Testing: Test features continuously alongside development.\n4. Retrospective: Improve quality processes iteratively.',
          content_ar: 'في منهجيات العمل الحديثة (Agile/Scrum)، يندمج موظف الجودة في كافة المراحل:\n\n1. تحليل المتطلبات: مراجعة قصص المستخدم ومعايير القبول.\n2. تخطيط الدورة (Sprint Planning): تقدير جهد الاختبار والسيناريوهات المتوقعة.\n3. الاختبار الأسبوعي: فحص الميزات بشكل مستمر بالتوازي مع البرمجة.\n4. الاجتماع التقييمي: تحسين آليات الجودة بشكل مستمر.',
          sort_order: 3,
        },
      ],
      challenge: {
        slug: 'login-form-verification-m1',
        title: 'Login Form Verification - Module 1',
        title_ar: 'التحقق من نموذج الدخول - الموديول الأول',
        description: 'Test the authentication login form and report all functional defects.',
        description_ar: 'قم باختبار نموذج تسجيل الدخول واكتشاف العيوب الوظيفية وإرسال تقارير الأخطاء.',
        scenario: 'You are assigned to verify the login module for the new TestCraft portal. Validate credential validation, error messaging, and button interactions.',
        scenario_ar: 'أنت مكلف باختبار موديول تسجيل الدخول لبوابة TestCraft الجديدة. تحقق من استجابة النظام والحقول ورسائل الخطأ.',
        instructions: '1. Access the embedded lab form.\n2. Attempt logging in with valid and invalid inputs.\n3. Document any unexpected behavior or UI crashes.\n4. Submit bug reports detailing reproduction steps.',
        instructions_ar: '1. ادخل إلى تطبيق المعمل التفاعلي.\n2. جرب تسجيل الدخول ببيانات صالحة وغير صالحة.\n3. وثق أي سلوك غير متوقع أو ثغرة بسيطة.\n4. أرسل بلاغات أخطاء واضحة مع خطوات إعادة التكرار.',
        base_xp_reward: 150,
      },
    },
    {
      slug: 'manual-testing-fundamentals',
      title: 'Manual Testing Fundamentals',
      title_ar: 'أساسيات الاختبار اليدوي',
      description: 'Master test case design, boundary value analysis, and equivalence partitioning.',
      description_ar: 'إتقان تصميم حالات الاختبار وتحليل القيم الحدية وتقسيم التكافؤ.',
      sort_order: 2,
      lessons: [
        {
          slug: 'test-case-design',
          title: 'Test Case Design & Execution',
          title_ar: 'تصميم وتنفيذ حالات الاختبار',
          summary: 'Structure effective test cases with clear preconditions, steps, and expected results.',
          summary_ar: 'بناء حالات اختبار موثوقة ذات خطوات محددة ونتائج متوقعة دقيقة.',
          content: 'A Test Case includes:\n- ID & Title\n- Preconditions\n- Test Steps\n- Test Data\n- Expected Result\n- Actual Result & Pass/Fail status.',
          content_ar: 'تتكون حالة الاختبار الممتازة من:\n- المعرف والعنوان\n- الشروط المسبقة\n- خطوات الاختبار المتسلسلة\n- بيانات الإدخال\n- النتيجة المتوقعة\n- النتيجة الفعلية وحالة الاختبار.',
          sort_order: 1,
        },
        {
          slug: 'bva-and-ep',
          title: 'Equivalence Partitioning & Boundary Value Analysis',
          title_ar: 'تقسيم التكافؤ وتحليل القيم الحدية',
          summary: 'Apply black-box test design techniques to select optimal test datasets.',
          summary_ar: 'تطبيق تقنيات الصندوق الأسود لاختيار أفضل مجموعات بيانات الاختبار.',
          content: 'Equivalence Partitioning (EP): Divide input domain into valid and invalid partitions. Test one representative value per partition.\n\nBoundary Value Analysis (BVA): Test values at the exact boundaries of input partitions (Min, Min-1, Min+1, Max, Max-1, Max+1). Most bugs occur at boundary conditions.',
          content_ar: 'تقسيم التكافؤ (EP): تقسيم بيانات المدخلات إلى فئات صالحة وغير صالحة واختبار عينة من كل فئة.\n\nتحليل القيم الحدية (BVA): التركيز على اختبار القيم الواقعة على حدود الفئات فوراً (الحد الأدنى والأقصى). ينشأ معظم الأخطاء عند هذه الحدود.',
          sort_order: 2,
        },
        {
          slug: 'exploratory-testing',
          title: 'Exploratory Testing Techniques',
          title_ar: 'تقنيات الاختبار الاستكشافي',
          summary: 'Combine learning, test design, and execution simultaneously to uncover hidden bugs.',
          summary_ar: 'الجمع بين التعلم وتصميم الاختبار والتنفيذ الفوري لاكتشاف الأخطاء الخفية.',
          content: 'Exploratory testing is simultaneous learning, test design, and execution. Instead of pre-scripted steps, testers use charters and intuition to discover unexpected edge-case defects.',
          content_ar: 'الاختبار الاستكشافي يعتمد على التعلم والتنفيذ الفوري دون الالتزام التام بسيناريوهات محددة سلفاً، مما يساعد المهندس على اكتشاف الأخطاء المعقدة.',
          sort_order: 3,
        },
      ],
      challenge: {
        slug: 'login-form-edge-cases-m2',
        title: 'Login Form Edge Cases - Module 2',
        title_ar: 'حالات الاستثناء بصفحة الدخول - الموديول الثاني',
        description: 'Apply boundary analysis and exploratory techniques on the login lab.',
        description_ar: 'تطبيق تحليل القيم الحدية والاختبار الاستكشافي على نموذج الدخول.',
        scenario: 'Apply equivalence partitioning and boundary value analysis to discover validation defects and edge cases in input fields.',
        scenario_ar: 'طبق تقنيات القيم الحدية وتقسيم التكافؤ لاكتشاف عيوب الحقول والأنماط المعقدة.',
        instructions: '1. Test max character lengths and special symbols in username/password fields.\n2. Observe response status codes and system behavior.\n3. Report bugs with precise steps.',
        instructions_ar: '1. اختبر الحدود القصوى للرموز والمدخلات الخاصة.\n2. لاحظ استجابة النظام وأي رسائل خطأ غريبة.\n3. سجل البلاغات بدقة.',
        base_xp_reward: 200,
      },
    },
    {
      slug: 'bug-reporting-and-defect-management',
      title: 'Bug Reporting & Defect Management',
      title_ar: 'كتابة البلاغات وإدارة العيوب',
      description: 'Learn how to write high-quality bug reports and manage defect lifecycles.',
      description_ar: 'تعلم كيفية كتابة تقارير أخطاء احترافية وإدارة دورة حياة البلاغات.',
      sort_order: 3,
      lessons: [
        {
          slug: 'anatomy-of-a-bug-report',
          title: 'Anatomy of an Effective Bug Report',
          title_ar: 'مكونات بلاغ الخطأ الاحترافي',
          summary: 'Write unambiguous, reproducible bug reports that developers love.',
          summary_ar: 'كتابة تقارير أخطاء واضحة وسهلة التكرار لمساعدة المطورين على إصلاحها بسرعة.',
          content: 'A Great Bug Report Has:\n1. Clear Summary: Concise description of the issue.\n2. Environment: OS, Browser, App Version.\n3. Steps to Reproduce: Numbered, unambiguous sequence.\n4. Expected vs Actual Result.\n5. Attachments: Screenshots, console logs, or videos.',
          content_ar: 'البلاغ الاحترافي يحتوي على:\n1. عنوان ملخص وواضح.\n2. بيئة الاختبار (المتصفح، النظام).\n3. خطوات إعادة التكرار مرقمة.\n4. النتيجة المتوقعة والنتيجة الفعلية.\n5. المرفقات والسجلات المساعدة.',
          sort_order: 1,
        },
        {
          slug: 'severity-vs-priority',
          title: 'Defect Severity vs Priority',
          title_ar: 'خطورة العيب مقابل الأولوية',
          summary: 'Distinguish business priority from technical impact severity.',
          summary_ar: 'التمييز بين الأهمية التجارية (البلورية) والشدة الفنية للخطأ (الخطورة).',
          content: 'Severity = Technical impact of the bug on the system (Critical, High, Medium, Low).\nPriority = Business urgency to fix the bug (P1-Immediate, P2-High, P3-Normal).\n\nExamples:\n- High Severity / Low Priority: Application crashes on a obscure legacy feature rarely used.\n- Low Severity / High Priority: Company logo on homepage is misspelled.',
          content_ar: 'الخطورة (Severity): مدى التأثير الفني والتقني للخطأ على النظام.\nالأولوية (Priority): السرعة الاستثمارية المطلوبة لإصلاح العيب.\n\nأمثلة:\n- خطورة عالية / أولوية منخفضة: انهيار للنظام في شاشة قديمة نادرة الاستخدام.\n- خطورة منخفضة / أولوية عالية: خطأ إملائي في شعار الشركة في الصفحة الرئيسية.',
          sort_order: 2,
        },
        {
          slug: 'defect-lifecycle',
          title: 'Defect Lifecycle & Tracking',
          title_ar: 'دورة حياة العيوب ومتابعتها',
          summary: 'Track defects from discovery through verification and closure.',
          summary_ar: 'متابعة البلاغات من لحظة اكتشافها وحتى التحقق منها وإغلاقها.',
          content: 'Defect Lifecycle States:\nNew → Open → Assigned → Fixed → Pending Retest → Verified / Closed (or Reopened).',
          content_ar: 'مراحل البلاغ:\nجديد ← مفتوح ← معين للمطور ← تم الإصلاح ← قيد إعادة الاختبار ← مغلق ومحقق (أو أعيد فتحه).',
          sort_order: 3,
        },
      ],
      challenge: {
        slug: 'defect-reporting-lab-m3',
        title: 'Defect Reporting Lab - Module 3',
        title_ar: 'معمل البلاغات والعيوب - الموديول الثالث',
        description: 'Demonstrate comprehensive defect logging and review readiness.',
        description_ar: 'إثبات القدرة على كتابة تقارير عيوب كاملة والتأهل للمراجعة النهائيّة.',
        scenario: 'Find all defects in the login application and submit formal bug reports with complete reproduction steps.',
        scenario_ar: 'اكتشف جميع الأخطاء في تطبيق الدخول وأرسل بلاغات رسمية كاملة الخطوات.',
        instructions: '1. Perform full test execution.\n2. Submit detailed bug reports for every issue found.\n3. Submit your final challenge attempt for admin review.',
        instructions_ar: '1. نفذ فحصاً كاملاً للشاشة.\n2. أرسل تقارير تفصيلية لكل عيب.\n3. أرسل المحاولة النهائية للمراجعة.',
        base_xp_reward: 250,
      },
    },
  ]

  // Seed modules, lessons, and challenges
  for (const mData of modulesData) {
    let { data: mod } = await supabase
      .from('learning_modules')
      .select('id')
      .eq('learning_path_id', pathId)
      .eq('slug', mData.slug)
      .maybeSingle()

    if (!mod) {
      const { data: newMod, error: modError } = await supabase
        .from('learning_modules')
        .insert({
          learning_path_id: pathId,
          slug: mData.slug,
          title: mData.title,
          title_en: mData.title,
          title_ar: mData.title_ar,
          description: mData.description,
          description_en: mData.description,
          description_ar: mData.description_ar,
          sort_order: mData.sort_order,
          is_published: true,
        })
        .select('id')
        .single()

      if (modError || !newMod) {
        console.error('Failed to create module:', modError)
        continue
      }
      mod = newMod
      createdModules++
    }

    const moduleId = mod.id
    let lastLessonId: string | null = null

    // Lessons
    for (const lData of mData.lessons) {
      let { data: lesson } = await supabase
        .from('lessons')
        .select('id')
        .eq('module_id', moduleId)
        .eq('slug', lData.slug)
        .maybeSingle()

      if (!lesson) {
        const { data: newLesson, error: lessonError } = await supabase
          .from('lessons')
          .insert({
            learning_path_id: pathId,
            module_id: moduleId,
            slug: lData.slug,
            title: lData.title,
            title_en: lData.title,
            title_ar: lData.title_ar,
            summary: lData.summary,
            summary_en: lData.summary,
            summary_ar: lData.summary_ar,
            content: lData.content,
            content_en: lData.content,
            content_ar: lData.content_ar,
            sort_order: lData.sort_order,
            estimated_minutes: 10,
            difficulty: 'Beginner',
            is_published: true,
          })
          .select('id')
          .single()

        if (lessonError || !newLesson) {
          console.error('Failed to create lesson:', lessonError)
          continue
        }
        lesson = newLesson
        createdLessons++
      }

      lastLessonId = lesson.id
    }

    // Challenge for this module
    if (mData.challenge) {
      const cData = mData.challenge
      const { data: existingChallenge } = await supabase
        .from('challenges')
        .select('id')
        .eq('slug', cData.slug)
        .maybeSingle()

      if (!existingChallenge) {
        const { error: chError } = await supabase
          .from('challenges')
          .insert({
            learning_path_id: pathId,
            module_id: moduleId,
            lesson_id: lastLessonId,
            slug: cData.slug,
            title: cData.title,
            title_en: cData.title,
            title_ar: cData.title_ar,
            description: cData.description,
            description_en: cData.description,
            description_ar: cData.description_ar,
            scenario: cData.scenario,
            scenario_en: cData.scenario,
            scenario_ar: cData.scenario_ar,
            instructions: cData.instructions,
            instructions_en: cData.instructions,
            instructions_ar: cData.instructions_ar,
            base_xp_reward: cData.base_xp_reward,
            difficulty: 'Beginner',
            challenge_type: 'bug_hunt',
            workflow_type: 'practical',
            practical_app_key: 'login_form',
            is_active: true,
            status: 'published',
            is_required: true,
            sort_order: mData.sort_order,
          })

        if (chError) {
          console.error('Failed to create challenge:', chError)
        } else {
          createdChallenges++
        }
      }
    }
  }

  const totalCreated = createdPaths + createdModules + createdLessons + createdChallenges
  const msg = totalCreated > 0
    ? `Successfully seeded: ${createdPaths} path(s), ${createdModules} module(s), ${createdLessons} lesson(s), ${createdChallenges} challenge(s).`
    : 'All demo content is already seeded. No changes were made.'

  return {
    success: true,
    message: msg,
    created: {
      paths: createdPaths,
      modules: createdModules,
      lessons: createdLessons,
      challenges: createdChallenges,
    },
  }
}
