// Fully authored pilot questions. Keys stay in admin-only persistence.
const pair=(en,ar)=>({en,ar})
const choice=(slug,kind,en,ar,options,answer,exEn,exAr)=>({
 slug,kind,prompt:pair(en,ar),options:options.map(([id,en,ar])=>({id,text:pair(en,ar)})),
 answer,explanation:pair(exEn,exAr),rubric:[],sort_order:0
})
const practice=(slug,en,ar,rubric,exEn,exAr)=>({
 slug,kind:'short_answer',prompt:pair(en,ar),options:[],answer:[],
 rubric:rubric.map(([en,ar])=>pair(en,ar)),explanation:pair(exEn,exAr),sort_order:0
})
const lessonData = {
 'software-testing-fundamentals':{
 minutes:8,
 summary:pair('Use explicit expectations, controlled data and observable results to explain what software testing can and cannot tell a delivery team. Practice recording a delivery-date discrepancy.',
 'تعلم ربط الملاحظة بتوقع واضح وتوثيق بيانات الفحص وحدوده. تدرب على وصف فرق في موعد توصيل افتراضي دون تخمين سببه.'),
 objectives:[
 ['Distinguish observed behavior from a cause hypothesis.','ميّز السلوك المرصود عن فرضية سببه.'],
 ['Compare a delivery result with an agreed cutoff rule.','قارن موعد التوصيل بقاعدة إغلاق متفق عليها.'],
 ['Describe one limitation of a passing test.','صف حدًا واحدًا للاستنتاج من نجاح الاختبار.']],
 activities:[
 choice('delivery-cutoff','scenario','Monday 14:05 order shows Tuesday. Under the stated rule, what should you record?','طلب الاثنين 14:05 يعرض الثلاثاء. ماذا تسجل وفق القاعدة؟',[
 ['a','Expected Wednesday; actual Tuesday, with time/build evidence.','المتوقع الأربعاء والفعلي الثلاثاء، مع توثيق الوقت والإصدار.'],
 ['b','Expected Tuesday because the screen says Tuesday.','المتوقع الثلاثاء لأن الشاشة تعرضه.'],
 ['c','The database is definitely corrupt.','قاعدة البيانات تالفة بالتأكيد.']],['a'],
 'The cutoff makes Wednesday the expectation. Record context; the screen is not the oracle and the cause is unproven.',
 'تحدد قاعدة الإغلاق الأربعاء متوقعًا. وثق السياق؛ الشاشة ليست المرجع والسبب غير مثبت.'),
 choice('passing-evidence','true_false','Passing two cutoff checks proves the feature has no defects.','نجاح فحصين لموعد الإغلاق يثبت خلو الخاصية من العيوب.',[
 ['true','True','صحيح'],['false','False','خطأ']],['false'],
 'Only two conditions were observed; weekend and timezone rules may remain untested.',
 'فُحص ظرفان فقط؛ قد تبقى قواعد العطلات والمناطق الزمنية دون فحص.'),
 practice('delivery-observation','Write expected/actual dates for Monday14:05 and context another tester needs.','اكتب الموعد المتوقع والفعلي لطلب الاثنين14:05 وسياقًا يحتاجه مختبر آخر.',[
 ['States Wednesday expected and Tuesday observed.','يذكر الأربعاء متوقعًا والثلاثاء فعليًا.'],
 ['Includes build and time/timezone context.','يحدد الإصدار والتوقيت والمنطقة الزمنية.'],
 ['Avoids an unsupported internal cause.','يتجنب الجزم بسبب داخلي دون دليل.']],
 'D17, Monday14:05 shop local time: expected Wednesday, actual Tuesday. This does not establish an implementation cause.',
 'D17، الاثنين14:05 بتوقيت المتجر: المتوقع الأربعاء والفعلي الثلاثاء. لا يثبت ذلك السبب البرمجي.')
 ]},
 'qa-vs-qc':{
 minutes:9,summary:pair('Separate product evaluation from process assurance using recurring subscription-price misunderstandings. Propose a targeted process improvement and evidence for evaluating it.',
 'فرّق بين تقييم المنتج وتحسين العمليات من خلال غموض أسعار الاشتراك. اقترح تحسينًا محددًا ودليلًا لتقييم فائدته.'),
 objectives:[['Classify product checks and process-assurance activities.','صنّف فحوص المنتج وأنشطة ضمان العمليات.'],
 ['Propose an improvement for recurring requirement ambiguity.','اقترح تحسينًا يعالج غموض المتطلبات المتكرر.'],
 ['Identify evidence for evaluating an improvement.','حدد دليلًا لتقييم فائدة التحسين.']],
 activities:[
 choice('price-action','single_choice','Which action mainly evaluates product quality?','أي إجراء يركز على تقييم جودة المنتج؟',[
 ['a','Compare C42 renewal quote with its agreed18-unit price.','قارن عرض تجديدC42 بسعره المتفق عليه18وحدة.'],
 ['b','Introduce a checklist for clarifying price rules.','أضف قائمة مراجعة لتوضيح قواعد الأسعار.'],
 ['c','Evaluate whether reviewers use the checklist effectively.','قيّم فاعلية استخدام المراجعين للقائمة.']],['a'],
 'The quote check evaluates the product. Introducing and evaluating review processes supports assurance.',
 'يفحص عرض السعر المنتج، بينما تدعم إضافة أسلوب المراجعة وتقييمه ضمان العملية.'),
 choice('qa-reasoning','multi_select','Select the supported statements.','اختر العبارات التي يدعمها الدرس.',[
 ['a','Product evaluation can happen before release.','يمكن تقييم المنتج قبل التسليم.'],
 ['b','A QA title makes one person solely responsible for quality.','يجعل مسمىQA شخصًا واحدًا مسؤولًا وحده عن الجودة.'],
 ['c','A checklist should be evaluated for usefulness.','ينبغي تقييم فائدة قائمة المراجعة.']],['a','c'],
 'QC can happen early, assurance needs evidence of usefulness, and quality remains shared.',
 'يمكن أن يبدأ ضبط الجودة مبكرًا ويحتاج الضمان إلى دليل فائدة وتظل الجودة مشتركة.'),
 practice('cancellation-improvement','Propose a current-feature check, process change and evidence of improvement for recurring deadline ambiguity.','اقترح فحصًا للخاصية الحالية وتحسينًا للعملية ودليل فائدته لغموض الموعد المتكرر.',[
 ['Checks product behavior against an agreed rule.','يفحص سلوك المنتج وفق قاعدة متفق عليها.'],
 ['Targets recurring specification ambiguity.','يعالج الغموض المتكرر في وصف المتطلب.'],
 ['Names observable improvement evidence.','يحدد دليل تحسن قابلًا للملاحظة.']],
 'Check cancellation against an explicit deadline; require timezone examples in review; sample later stories for ambiguity detected before coding.',
 'افحص الإلغاء وفق موعد واضح، واشترط أمثلة للتوقيت في المراجعة، وراجع القصص التالية لرصد الغموض المكتشف مبكرًا.')
 ]},
 'sdlc-and-qa':{
 minutes:10,summary:pair('Choose useful quality activities throughout a development life cycle. Compare sequential and iterative feedback timing and distinguish Agile from the Scrum framework.',
 'اختر أنشطة جودة عبر دورة التطوير وقارن توقيت التغذية الراجعة في العمل المتتابع والتكراري وميز مبادئAgile عن إطارScrum.'),
 objectives:[['Place clarification, execution and release evidence in a life cycle.','ضع التوضيح والتنفيذ وأدلة التسليم في دورة الحياة.'],
 ['Distinguish Agile principles from the Scrum framework.','ميّز مبادئAgile عن إطارScrum.'],
 ['Write a deadline acceptance example before implementation.','اكتب مثال قبول للموعد قبل التنفيذ.']],
 activities:[
 choice('deadline-timing','scenario','Nobody agreed what happens exactly at18:00. What useful earlier action was missed?','لم يتفق الفريق على السلوك عند18:00تمامًا. ما الإجراء المبكر الذي غاب؟',[
 ['a','Agree an acceptance example including inclusivity and timezone.','الاتفاق على مثال قبول يوضح شمول الموعد والمنطقة الزمنية.'],
 ['b','Remove all running-system tests.','إلغاء كل اختبارات النظام العامل.'],
 ['c','Assume developers will choose the same rule.','افتراض اختيار المطورين القاعدة نفسها.']],['a'],
 'Clarification reduces ambiguity before coding; running-system verification still matters.',
 'يقلل التوضيح الغموض قبل البرمجة مع استمرار أهمية التحقق بعد التشغيل.'),
 choice('scrum-meaning','true_false','Agile and Scrum are interchangeable names.','Agile وScrum اسمان قابلان للتبادل.',[
 ['true','True','صحيح'],['false','False','خطأ']],['false'],
 'Agile describes values and principles; Scrum is a framework for organizing complex product work.',
 'تشيرAgile إلى قيم ومبادئ بينماScrum إطار لتنظيم العمل المعقد.'),
 practice('deadline-example','Write an explicit acceptance example at18:00 and a check requiring running software.','اكتب مثال قبول صريحًا عند18:00 وفحصًا يحتاج إلى نظام يعمل.',[
 ['States an inclusive/exclusive decision explicitly.','يحدد قرار الشمول أو الاستبعاد صراحة.'],
 ['Names account timezone.','يحدد المنطقة الزمنية للحساب.'],
 ['Describes an observable execution check.','يصف فحصًا تنفيذيًا قابلًا للملاحظة.']],
 'Agreement: cancellation at exactly18:00 account time is accepted; verify confirmation on the running build. Either decision works if explicitly agreed.',
 'اتفاق: قبول الإلغاء عند18:00بتوقيت الحساب؛ تحقق من التأكيد على الإصدار العامل. يجوز القرار الآخر إذا اتفق عليه صراحة.')
 ]}
}


Object.assign(lessonData,{
 'test-case-design':{
 minutes:10,summary:pair('Design and execute a focused recovery test with explicit preconditions, data, steps and expected results. Separate the reusable case from build-specific execution evidence.',
 'صمم ونفذ فحص استعادة محددًا بشروط وبيانات وخطوات ونتائج واضحة، وافصل الحالة القابلة للتكرار عن دليل تنفيذها على إصدار معين.'),
 objectives:[['Write specific preconditions and recovery inputs.','اكتب شروطًا ومدخلات محددة لفحص الاستعادة.'],
 ['Derive expected results from the neutral-confirmation rule.','استمد المتوقع من قاعدة التأكيد المحايد.'],
 ['Distinguish failed execution from blocked execution.','ميّز فشل التنفيذ عن تعذر إجرائه.']],
 activities:[
 choice('recovery-expectation','scenario','For a valid unregistered address, what confirmation follows REC-R1?','ما التأكيد المتوقع لعنوان صحيح الصيغة وغير مسجل وفقREC-R1؟',[
 ['a','The same neutral message used for registered addresses.','الرسالة المحايدة نفسها للعناوين المسجلة.'],
 ['b','Account not found; please register.','الحساب غير موجود؛ سجل أولًا.'],
 ['c','Whatever the current build shows.','أي رسالة يعرضها الإصدار الحالي.']],['a'],
 'The rule avoids disclosing account existence. Expected behavior comes from the requirement, not the current screen.',
 'تمنع القاعدة كشف وجود الحساب. نستمد المتوقع من المتطلب وليس الشاشة الحالية.'),
 choice('blocked-execution','single_choice','The lab is unavailable before you can open recovery. Record the check as:','المعمل غير متاح قبل فتح الاستعادة. تسجل الفحص بوصفه:',[
 ['a','Blocked, documenting the dependency.','متعذر التنفيذ مع توثيق الاعتماد.'],
 ['b','Passed because no defect was seen.','ناجح لعدم ملاحظة عيب.'],
 ['c','Deleted because it cannot pass.','محذوف لأنه لا ينجح.']],['a'],
 'The check could not be meaningfully performed. Preserve the case and the reason for blocked execution.',
 'لم يكن إجراء الفحص ممكنًا بصورة مفيدة. احفظ الحالة وسبب تعذر التنفيذ.'),
 practice('recovery-case','Write REC-02 for unregistered new.person@example.test with preconditions, steps and exact neutral confirmation.','اكتبREC-02 للعنوان غير المسجلnew.person@example.test مع الشروط والخطوات والتأكيد المحايد.',[
 ['Uses reset signed-out state and synthetic unregistered data.','يستخدم حالة خروج بعد الضبط وبيانات اصطناعية غير مسجلة.'],
 ['Provides ordered actions and observable outcomes.','يقدم خطوات مرتبة ونتائج قابلة للملاحظة.'],
 ['Does not disclose account existence.','لا يكشف وجود الحساب.']],
 'Reset R12; open recovery while signed out; submit the address once; expect “If an account exists, recovery instructions will be sent.”',
 'أعد ضبطR12 وافتح الاستعادة دون دخول وأرسل العنوان مرة؛ المتوقع «إذا كان الحساب موجودًا، فستُرسل تعليمات الاستعادة».')
 ]},
 'bva-and-ep':{
 minutes:12,summary:pair('Model input partitions and test values near inclusive integer boundaries. Practice selecting age data while recognizing the limits of representative and boundary checks.',
 'نمذج فئات المدخلات واختبر حدود مجال صحيح شامل الطرفين. تدرب على اختيار بيانات العمر مع إدراك حدود الفحوص الممثلة والحدية.'),
 objectives:[['Partition an integer domain by expected handling.','قسّم مجال الأعداد الصحيحة وفق المعالجة المتوقعة.'],
 ['Select a three-value boundary set for an inclusive range.','اختر حدودًا بأسلوب الثلاث قيم لمجال شامل الطرفين.'],
 ['State expected outcomes with other conditions controlled.','حدد النتائج المتوقعة مع ضبط الشروط الأخرى.']],
 activities:[
 choice('quantity-boundary','multi_select','Quantity accepts integers10–50 inclusive. Which values must be rejected?','تقبل الكمية أعدادًا صحيحة10–50شاملًا الطرفين. أي القيم تُرفض؟',[
 ['a','9','القيمة9'],['b','10','القيمة10'],['c','50','القيمة50'],['d','51','القيمة51']],['a','d'],
 '9 is below minimum and51 above maximum. The endpoints10 and50 are accepted.',
 '9أقل من الأدنى و51أعلى من الأقصى، بينما يُقبل الطرفان10و50.'),
 choice('boundary-domain','single_choice','Why is9 the immediate lower neighbor of10 here?','لماذا9 هي القيمة السابقة مباشرة لـ10هنا؟',[
 ['a','The domain uses whole numbers.','لأن المجال أعداد صحيحة.'],
 ['b','All system inputs have a step of one.','لأن كل المدخلات تزيد بمقدارواحد.'],
 ['c','The programming language requires this.','لأن لغة البرمجة تفرضه.']],['a'],
 'The input domain determines adjacency; currency and time may use other precision.',
 'يحدد مجال المدخلات التجاور؛ وقد تختلف دقة المبالغ والمواعيد.'),
 practice('age-data','For integer ages18–65 give partitions, three-value boundaries, outcomes for17/18/66 and a noninteger check.','للأعمار الصحيحة18–65 حدد الفئات والحدود والمتوقع لـ17و18و66 وفحصًا لغير الصحيح.',[
 ['Defines below, in-range and above integer partitions.','يحدد فئات الصحيح الأقل وداخل المجال والأعلى.'],
 ['Includes17,18,19,64,65,66 with consistent results.','يتضمن17و18و19و64و65و66 بنتائج متسقة.'],
 ['Includes decimal/missing/text outside integer partitions.','يضيف كسرًا أو فراغًا أو نصًا خارج فئات الصحيح.']],
 'Partitions <18,18–65,>65; boundaries17/18/19/64/65/66. Reject17,66 and18.5; accept18.',
 'الفئات أقل من18، ومن18إلى65، وأكبر من65؛ الحدود17و18و19و64و65و66. يُرفض17و66و18.5 ويُقبل18.')
 ]},
 'exploratory-testing':{
 minutes:10,summary:pair('Plan a focused exploratory session with a charter, timebox and reproducible notes. Adapt the next test to observed cart behavior and distinguish observations from hypotheses.',
 'خطط لاستكشاف ذي غرض وزمن وملاحظات قابلة للتكرار. وجّه الفحص التالي وفق سلوك السلة، وميز الملاحظة عن فرضية السبب.'),
 objectives:[['Write a charter naming scope, resources and risk.','اكتب ميثاقًا يحدد النطاق والموارد والخطر.'],
 ['Choose a follow-up based on an observation.','اختر فحص متابعة بناء على ملاحظة.'],
 ['Summarize examined conditions and open questions.','لخص الظروف المفحوصة والأسئلة المتبقية.']],
 activities:[
 choice('cart-follow-up','scenario','One notebook persists after refresh, but changing quantity to2 does not. Choose a focused next check.','يبقى دفتر بعد التحديث لكن تغيير الكمية إلى2لا يبقى. اختر متابعة مركزة.',[
 ['a','Reset and repeat with quantity3 on the same build/account.','أعد الضبط وكرر بكمية3 على الإصدار والحساب نفسيهما.'],
 ['b','Switch silently to testing search colors.','انتقل بصمت إلى ألوان البحث.'],
 ['c','Declare the database broken without investigating.','اجزم بتعطل قاعدة البيانات دون تحقيق.']],['a'],
 'Varying quantity examines the observed persistence condition while controlling context. The cause is still a hypothesis.',
 'يفحص تغيير الكمية شرط الحفظ المرصود مع ضبط السياق، ويظل السبب فرضية.'),
 choice('exploration-evidence','multi_select','What belongs in the debrief?','ما الذي يُضمّن في مراجعة الجلسة؟',[
 ['a','Charter, build, data and observations.','الميثاق والإصدار والبيانات والملاحظات.'],
 ['b','Untested conditions and questions.','الظروف غير المفحوصة والأسئلة.'],
 ['c','A100%coverage guarantee because time ended.','ضمان تغطية100%لانتهاء الوقت.']],['a','b'],
 'Report actual scope and limitations. Time elapsed cannot establish coverage.',
 'صف النطاق الفعلي وحدوده؛ الزمن المنقضي لا يثبت التغطية.'),
 practice('recovery-charter','Write a ten-minute recovery-navigation charter with data, oracle, two checks and an observation-led follow-up.','اكتب ميثاقًا لعشر دقائق عن الاستعادة والتنقل مع البيانات والمرجع وفحصين ومتابعة تقودها الملاحظة.',[
 ['Names narrow scope, timebox and synthetic data.','يحدد نطاقًا ضيقًا وزمنًا وبيانات اصطناعية.'],
 ['Uses the neutral-confirmation rule and two starting checks.','يستخدم قاعدة التأكيد المحايد وفحصين للبدء.'],
 ['Explains how an observation changes the next check.','يشرح كيف تغير الملاحظة الفحص التالي.']],
 'Explore confirmation across back navigation; submit a synthetic address, navigate away/back, then investigate unexpected duplicate confirmation.',
 'استكشف التأكيد بعد الرجوع؛ أرسل عنوانًا اصطناعيًا وغادر وعد ثم تحقق من تكرار تأكيد غير متوقع.')
 ]},
 'anatomy-of-a-bug-report':{
 minutes:10,summary:pair('Write a reproducible report with safe evidence, clear expected/actual results and a focused title. Separate the cart observation from unsupported cause or payment-impact claims.',
 'اكتب بلاغًا قابلًا للتكرار بأدلة آمنة ونتائج واضحة وعنوان محدد. افصل ملاحظة السلة عن افتراضات السبب أو أثر الدفع غير المثبتة.'),
 objectives:[['Write numbered steps using controlled data.','اكتب خطوات مرقمة ببيانات مضبوطة.'],
 ['Separate observations from cause hypotheses.','افصل الملاحظات عن فرضيات السبب.'],
 ['Choose evidence without real personal credentials.','اختر دليلًا خاليًا من اعتمادات شخصية حقيقية.']],
 activities:[
 choice('cart-report-title','single_choice','Choose the clearest title for the worked cart finding.','اختر أوضح عنوان لملاحظة السلة.',[
 ['a','N1 subtotal stays12 after quantity increases to3.','يظل مجموعN1يساوي12بعد رفع الكمية إلى3.'],
 ['b','Everything is broken; urgent.','كل شيء معطل؛ عاجل.'],
 ['c','The database multiplication code is wrong.','كود الضرب في قاعدة البيانات خاطئ.']],['a'],
 'It names the condition and observation; the alternatives are vague or assert an unproven cause.',
 'يسمي الظرف والملاحظة، بينما البديلان غامضان أو يجزمان بسبب غير مثبت.'),
 choice('safe-reporting','multi_select','Which details support safe reproducibility?','أي التفاصيل تدعم تكرارًا آمنًا؟',[
 ['a','Reset state, buildS8 and fictional productN1.','حالة بعد الضبط وإصدارS8ومنتج افتراضيN1.'],
 ['b','Expected36, actual12 and numbered steps.','المتوقع36والفعلي12وخطوات مرقمة.'],
 ['c','A real customer password in a screenshot.','كلمة مرور عميل حقيقي بلقطة.']],['a','b'],
 'Controlled context and explicit results support reproduction. Do not capture real credentials.',
 'يدعم السياق المضبوط والنتائج الواضحة التكرار. لا تلتقط اعتمادات حقيقية.'),
 practice('cart-bug-report','Rewrite “Checkout wrong, urgent” usingN1 and explain evidence limitations.','أعد كتابة«الدفع خطأ،عاجل»باستخدامN1واشرح حدود الدليل.',[
 ['Includes title, build, reset precondition and price data.','يتضمن العنوان والإصدار والضبط وبيانات السعر.'],
 ['Gives steps and expected36/actual12 at quantity3.','يقدم الخطوات والمتوقع36والفعلي12عند كمية3.'],
 ['Does not infer real payment loss from display alone.','لا يستنتج خسارة دفع حقيقية من العرض وحده.']],
 'S8, reset cart,N1price12, quantity3, expected36/actual12; the displayed total does not prove a charged amount.',
 'S8،سلة بعد الضبط،سعرN1يساوي12وكمية3والمتوقع36والفعلي12؛ لا يثبت العرض المبلغ المخصوم.')
 ]},
 'severity-vs-priority':{
 minutes:10,summary:pair('Explain defect impact separately from scheduling urgency. Use affected scope, workarounds and release context to justify triage without assuming universal severity labels.',
 'فسر أثر العيب مستقلًا عن استعجال الإصلاح، واستخدم النطاق والبدائل وسياق التسليم لتبرير الفرز دون افتراض معان عالمية للدرجات.'),
 objectives:[['Distinguish impact severity from urgency priority.','ميّز خطورة الأثر عن أولوية الاستعجال.'],
 ['Identify missing context for a triage decision.','حدد السياق الناقص لقرار الفرز.'],
 ['Write separate impact and urgency statements.','اكتب بيانين مستقلين للأثر والاستعجال.']],
 activities:[
 choice('campaign-context','scenario','Wrong event date before tomorrow’s campaign: which statement addresses priority?','تاريخ فعالية خاطئ قبل حملة الغد: أي عبارة تتعلق بالأولوية؟',[
 ['a','The campaign starts tomorrow, making correction time-sensitive.','تبدأ الحملة غدًا، ما يجعل التصحيح حساسًا للوقت.'],
 ['b','The application did not crash.','لم ينهَر التطبيق.'],
 ['c','Noncrashing issues always have low priority.','كل عيب دون انهيار منخفض الأولوية.']],['a'],
 'The campaign timing affects urgency; lack of a crash does not determine priority.',
 'يؤثر توقيت الحملة في الاستعجال؛ وعدم الانهيار لا يحدد الأولوية.'),
 choice('severity-priority-relation','true_false','Severity automatically determines priority in every team.','تحدد الخطورة الأولوية آليًا في كل فريق.',[
 ['true','True','صحيح'],['false','False','خطأ']],['false'],
 'Exposure, commitments, release timing and mitigation also inform priority under local policy.',
 'يسهم التعرض والالتزامات والتوقيت والتخفيف في الأولوية وفق سياسة الفريق.'),
 practice('triage-note','Compare an admin export crash with a wrong renewal date in tonight’s notices: impact, urgency and missing facts.','قارن انهيار تصدير إداري بتاريخ تجديد خاطئ في إشعارات الليلة: الأثر والاستعجال والوقائع الناقصة.',[
 ['Separates impact from urgency for both reports.','يفصل الأثر عن الاستعجال للبلاغين.'],
 ['Considers exposure, timing and practical workarounds.','يراعي التعرض والتوقيت والبدائل العملية.'],
 ['Requests missing facts before assigning local labels.','يطلب الوقائع الناقصة قبل اختيار الدرجات.']],
 'Export impact depends on affected tasks and workaround; urgency on need date. Renewal dates may mislead users tonight; ask scope and mitigation.',
 'يتوقف أثر التصدير على المهام والبديل واستعجاله على الموعد. قد تضلل تواريخ التجديد مستخدمين الليلة؛ اسأل عن النطاق والتخفيف.')
 ]},
 'defect-lifecycle':{
 minutes:10,summary:pair('Track evidence and responsibility from discovery through retest and closure. Distinguish confirmation from regression and retain report history when a fix remains incomplete.',
 'تابع الأدلة والمسؤولية من الاكتشاف إلى التحقق والإغلاق. ميز التأكد من الإصلاح عن الانحدار واحفظ تاريخ البلاغ إذا لم يكتمل الإصلاح.'),
 objectives:[['Explain evidence needed to verify a proposed fix.','اشرح الدليل اللازم للتحقق من إصلاح مقترح.'],
 ['Distinguish confirmation from regression testing.','ميّز التأكد من الإصلاح عن اختبار الانحدار.'],
 ['Write a retest note preserving earlier evidence.','اكتب ملاحظة إعادة اختبار تحفظ الأدلة السابقة.']],
 activities:[
 choice('retest-failure','scenario','S9 is marked fixed, but original steps still show12 instead of36. What next?','وُسمS9بأنه مُصلح لكن الخطوات الأصلية تعرض12بدل36. ماذا تفعل؟',[
 ['a','RecordS9 evidence and reopen/return under team policy.','سجل دليلS9وأعد الفتح أو الإرجاع وفق السياسة.'],
 ['b','Close because the developer changed status.','أغلق لأن المطور غير الحالة.'],
 ['c','EraseS8 and create unrelated reports.','امحS8وأنشئ بلاغات غير مترابطة.']],['a'],
 'A fix claim requires verification. Preserve executions and follow the local workflow.',
 'يحتاج إعلان الإصلاح إلى تحقق؛ احفظ التنفيذات واتبع سير العمل المحلي.'),
 choice('regression-scope','multi_select','After confirming quantity3 totals36, which checks address side effects?','بعد التأكد أن كمية3مجموعها36،أي الفحوص تستهدف آثارًا جانبية؟',[
 ['a','Reduce quantity to1 and check total.','اخفض الكمية إلى1وافحص المجموع.'],
 ['b','Remove the item and inspect the empty cart.','احذف العنصر وافحص السلة الفارغة.'],
 ['c','Treat fixed status alone as regression evidence.','اعتبر حالة تم الإصلاح دليل انحدار وحدها.']],['a','b'],
 'Related previously working behaviors are regression candidates. A status label is not executed evidence.',
 'تصلح السلوكيات المرتبطة التي كانت تعمل لفحوص الانحدار. اسم الحالة ليس دليل تنفيذ.'),
 practice('retest-note','Write anS9 retest note for unresolvedN1 subtotal, requested transition and one later regression check.','اكتب ملاحظة إعادة اختبارS9لمجموعN1المستمر والانتقال المطلوب وفحص انحدار لاحق.',[
 ['NamesS9, reset, quantity3 and expected36/actual12.','يحددS9والضبط وكمية3والمتوقع36والفعلي12.'],
 ['PreservesS8 evidence and requests return under policy.','يحفظ دليلS8ويطلب الإرجاع وفق السياسة.'],
 ['Names a regression check distinct from original confirmation.','يسمي فحص انحدار مختلفًا عن التأكد الأصلي.']],
 'S9 reset,N1quantity3 still12 instead of36: return for investigation withS8 link. After a fix, check removal and quantity reduction.',
 'S9بعد الضبط،كميةN1تساوي3والمجموع12بدل36:أرجع للتحقيق مع رابطS8.بعد الإصلاح افحص الحذف وخفض الكمية.')
 ]}
})


const assessments={
 'intro-to-qa':[
 choice('release-evidence','scenario','Do two passing delivery checks prove the release is safe? Choose a defensible response.','هل يثبت نجاح فحصي التوصيل أمان التسليم؟ اختر ردًا مدعومًا.',[
 ['a','Describe tested conditions and remaining risks before deciding.','صف الظروف المفحوصة والمخاطر المتبقية قبل القرار.'],
 ['b','Guarantee there are no defects.','اضمن عدم وجود عيوب.'],
 ['c','Discard the passing evidence entirely.','تجاهل أدلة النجاح كلها.']],['a'],
 'Passing evidence is useful within its scope, but cannot guarantee defect absence.',
 'تفيد أدلة النجاح ضمن نطاقها، لكنها لا تضمن غياب العيوب.'),
 choice('quality-timing','multi_select','An ambiguous deadline needs which complementary actions?','ما الإجراءات المتكاملة لموعد غامض؟',[
 ['a','Clarify an acceptance example before coding.','وضح مثال قبول قبل البرمجة.'],
 ['b','Test the running behavior against that example.','اختبر السلوك العامل وفق المثال.'],
 ['c','Make one tester solely responsible for quality.','اجعل مختبرًا واحدًا مسؤولًا وحده عن الجودة.']],['a','b'],
 'Earlier clarification and later execution address different uncertainties; quality is shared.',
 'يعالج التوضيح المبكر والتنفيذ اللاحق جوانب مختلفة من عدم اليقين، والجودة مشتركة.'),
 practice('team-response','For recurring delivery-cutoff ambiguity, propose a product check, a process improvement and the timing of each.','لغموض موعد التوصيل المتكرر، اقترح فحص منتج وتحسين عملية وتوقيت كل منهما.',[
 ['Uses explicit data and expectation for the product check.','يستخدم بيانات وتوقعًا واضحين لفحص المنتج.'],
 ['Targets requirement clarity in the process change.','يستهدف وضوح المتطلب في تحسين العملية.'],
 ['Combines early feedback and running verification.','يجمع التغذية المبكرة والتحقق بعد التشغيل.']],
 'Review timezone/cutoff examples before coding, then run an agreed example on the build and report scope and limits.',
 'راجع أمثلة التوقيت والإغلاق قبل البرمجة، ثم نفذ مثالًا متفقًا عليه وسجل النطاق والحدود.')
 ],
 'manual-testing-fundamentals':[
 choice('minimum-case','scenario','Inclusive range10–50 rejects10 but accepts11. What should the test record say?','مجال شامل10–50يرفض10ويقبل11. ماذا تسجل؟',[
 ['a','At10 expect acceptance; actual rejection, with build/reset/data.','عند10المتوقع قبول والفعلي رفض مع الإصدار والضبط والبيانات.'],
 ['b','Change the expected result to rejection.','غير المتوقع إلى الرفض.'],
 ['c','All quantities fail.','كل الكميات تفشل.']],['a'],
 'The inclusive requirement determines the expected result. Do not generalize beyond observed values.',
 'يحدد المتطلب الشامل المتوقع. لا تعمم على قيم لم تُفحص.'),
 choice('session-notes','multi_select','Which artifacts make an exploratory finding reusable?','ما المخرجات التي تجعل نتيجة الاستكشاف قابلة لإعادة الاستخدام؟',[
 ['a','Charter and notes with build, state and findings.','ميثاق وملاحظات بالإصدار والحالة والنتائج.'],
 ['b','A focused reproduction case with expected/actual results.','حالة تكرار مركزة بمتوقع وفعلي.'],
 ['c','A coverage guarantee based on elapsed minutes.','ضمان تغطية مبني على الزمن.']],['a','b'],
 'Purposeful notes and repeatable checks communicate evidence; time alone is not coverage.',
 'تنقل الملاحظات الهادفة والفحوص المتكررة الأدلة؛ الوقت وحده ليس تغطية.'),
 practice('test-plan','Outline a quantity10 boundary case and a ten-minute charter for a different cart risk.','صمم حالة لحد الكمية10وميثاقًا لعشر دقائق عن خطر آخر في السلة.',[
 ['Includes preconditions, data, steps and expected outcome.','يشمل الشروط والبيانات والخطوات والمتوقع.'],
 ['Uses inclusive boundaries consistently.','يستخدم الحدود الشاملة باتساق.'],
 ['Charter names another risk and records observations.','يسمي الميثاق خطرًا آخر ويسجل الملاحظات.']],
 'Reset and check10 with expected acceptance; separately explore persistence after refresh using a controlled account and notes.',
 'أعد الضبط وافحص10مع توقع القبول؛ واستكشف منفصلًا الحفظ بعد التحديث بحساب مضبوط وملاحظات.')
 ],
 'bug-reporting-and-defect-management':[
 choice('fix-verification','scenario','A report is fixed with no build number or retest evidence. What is still needed?','وسم البلاغ بأنه مُصلح دون إصدار أو دليل إعادة اختبار. ما المطلوب؟',[
 ['a','Identify the fixed build and verify the original condition.','حدد إصدار الإصلاح وتحقق من الحالة الأصلية.'],
 ['b','Close all related reports automatically.','أغلق كل البلاغات المرتبطة آليًا.'],
 ['c','Remove original steps.','احذف الخطوات الأصلية.']],['a'],
 'A status is a claim; confirmation on an identified build supports the next decision.',
 'الحالة إعلان؛ ويدعم التحقق على إصدار محدد القرار التالي.'),
 choice('triage-evidence','multi_select','Which statements separate impact, urgency and facts?','أي العبارات تفصل الأثر والاستعجال والوقائع؟',[
 ['a','Wrong event date affects all visitors; campaign starts tomorrow.','تاريخ الفعالية خاطئ لكل الزوار والحملة غدًا.'],
 ['b','Subtotal differs; actual payment has not been investigated.','الإجمالي مختلف ولم يُحقق في الدفع الفعلي.'],
 ['c','No crash means no impact or urgency.','عدم الانهيار يعني غياب الأثر والاستعجال.']],['a','b'],
 'The first two describe scope/context and limitations. A noncrashing issue can still mislead users.',
 'تصف الأوليان النطاق والسياق والحدود. قد يضلل عيب دون انهيار المستخدمين.'),
 practice('report-review','Write a cart report, impact/urgency notes and a retest decision ifS9 still fails.','اكتب بلاغ سلة وملاحظات أثر واستعجال وقرار إعادة اختبار إذا استمر الفشل فيS9.',[
 ['Report is reproducible with explicit expected/actual values.','البلاغ قابل للتكرار وبقيم متوقعة وفعلية صريحة.'],
 ['Separates impact and timing without unsupported payment claims.','يفصل الأثر والتوقيت دون ادعاء دفع غير مثبت.'],
 ['Preserves history and requests appropriate return transition.','يحفظ التاريخ ويطلب انتقال الإرجاع المناسب.']],
 'N1quantity3 expected36/actual12; explain misleading display and timing; preserveS8/S9 evidence and return the unresolved report.',
 'N1بكمية3والمتوقع36والفعلي12؛ وضح تضليل العرض والتوقيت واحفظ أدلةS8وS9وأرجع البلاغ غير المحلول.')
 ]
}
module.exports={lessonData,assessments}
