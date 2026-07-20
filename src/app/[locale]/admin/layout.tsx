import { type ReactNode } from 'react'
import { type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { requireAdmin } from '@/lib/auth/require-admin'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminTopbar } from '@/components/admin/admin-topbar'

interface AdminLayoutProps {
  children: ReactNode
  params: {
    locale: Locale
  }
}

/**
 * Admin Layout (Server Component)
 *
 * Provides a secure wrapper around all /admin routes.
 * Calling `requireAdmin` ensures that ANY route under this layout
 * is inherently protected and inaccessible to non-admins.
 */
export default async function AdminLayout({ children, params: { locale } }: AdminLayoutProps) {
  // 1. Enforce strict admin access server-side
  const { user } = await requireAdmin(locale)
  
  // 2. Fetch i18n dictionary for the UI
  const dictionary = await getDictionary(locale)

  return (
    <div className="admin-shell flex min-h-screen w-full text-foreground transition-colors">
      {/* Sidebar (Desktop) */}
      <AdminSidebar dictionary={dictionary} locale={locale} />
      
      {/* Main content wrapper */}
      <div className="flex flex-1 flex-col min-w-0 sm:ms-64 transition-all">
        {/* Topbar */}
        <AdminTopbar dictionary={dictionary} locale={locale} email={user.email ?? ''} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden p-6 sm:p-10 animate-fade-in-up">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
