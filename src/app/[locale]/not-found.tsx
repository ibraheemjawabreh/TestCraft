import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <h1 className="font-heading text-4xl font-bold text-foreground">404</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        الصفحة غير موجودة أو تم حذف التحدي.
      </p>
      <Link
        href="/academy/challenges"
        className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        العودة إلى التحديات
      </Link>
    </div>
  )
}
