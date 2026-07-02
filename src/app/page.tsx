import { redirect } from 'next/navigation'

/**
 * Root route — immediately redirects to the login page.
 * Once a user is authenticated, the middleware will redirect them to /dashboard.
 */
export default function RootPage() {
  redirect('/login')
}
