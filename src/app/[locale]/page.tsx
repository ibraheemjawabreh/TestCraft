import { redirect } from 'next/navigation'

/**
 * Root route — immediately redirects to the login page.
 * Once a user is authenticated, the middleware will redirect them to /academy.
 */
export default function RootPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/login`)
}
