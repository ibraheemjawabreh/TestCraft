import { curriculumMigrationPath } from '@/lib/curriculum/schema-status'

export function CurriculumSetupNotice({ locale }: { locale: 'en' | 'ar' }) {
  const ar = locale === 'ar'
  return <aside role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 space-y-3">
    <h2 className="font-semibold">{ar ? 'يلزم تحديث قاعدة بيانات المنهج' : 'Curriculum database update required'}</h2>
    <p className="text-sm">{ar
      ? 'المحتوى الحالي متاح للقراءة. الاستيراد والتصدير والتعديل والنشر والأرشفة والترتيب معطّلة حتى تطبيق تحديث قاعدة البيانات.'
      : 'Existing content is available in read-only mode. Import, export, editing, publication, archiving and reordering are disabled until the database update is applied.'}</p>
    <p className="text-sm">{ar
      ? 'افتح Supabase ← SQL Editor، ونفّذ محتوى الملف المحدّث التالي كاملًا، ثم أعد تحميل الصفحة. يفحص الملف المتطلبات ويكمل جدول متطلبات الدروس إن كان ناقصًا:'
      : 'In Supabase → SQL Editor, run the complete updated file below, then reload this page. It checks base dependencies and supplies missing lesson prerequisites:'}</p>
    <code dir="ltr" className="block break-all text-sm">{curriculumMigrationPath}</code>
    <a href={`/${locale}/admin/curriculum`} className="inline-block rounded-lg border border-border bg-background px-3 py-2 text-sm">{ar ? 'إعادة فحص قاعدة البيانات' : 'Recheck database setup'}</a>
  </aside>
}
