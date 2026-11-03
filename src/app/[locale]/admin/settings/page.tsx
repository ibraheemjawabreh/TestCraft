import { resolveLocale } from '@/lib/locale'
import { getAdminSettingsProfile } from '@/lib/admin/settings'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import { Settings, User, ShieldAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface AdminSettingsPageProps {
  params: Promise<{
    locale: string
  }>
}

export default async function AdminSettingsPage({ params }: AdminSettingsPageProps) {
  const { locale: routeLocale } = await params
  const locale = resolveLocale(routeLocale)

  const dictionary = await getDictionary(locale)
  const result = await getAdminSettingsProfile()
  const t = dictionary.admin.settings

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          {t.title}
        </h1>
        <p className="mt-2 text-lg max-w-3xl text-muted-foreground">
          {t.subtitle}
        </p>
      </div>

      {!result.data ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

          <div className="md:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  {t.adminProfile}
                </CardTitle>
                <CardDescription>Your current administrator profile details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4 border-b pb-6">
                  {result.data.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.data.avatarUrl}
                      alt={result.data.username}
                      className="w-16 h-16 rounded-full border bg-muted"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full border bg-muted flex items-center justify-center">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-semibold">{result.data.username}</h3>
                    <Badge variant="default" className="mt-1">
                      {result.data.role.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>User ID</Label>
                    <Input value={result.data.id} disabled className="bg-muted/50 font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={result.data.email ?? 'No email linked'} disabled className="bg-muted/50" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  {t.platformSettings}
                </CardTitle>
                <CardDescription>Configure global application settings (Placeholder).</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-secondary/50 p-6 flex flex-col items-center justify-center text-center gap-2 border border-dashed text-muted-foreground">
                  <Settings className="h-8 w-8 opacity-50" />
                  <p>Global settings module is currently under development.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="h-5 w-5" />
                  {t.securityNotice}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t.securityNoticeText}
                </p>
              </CardContent>
            </Card>
          </div>

        </div>
      )}
    </div>
  )
}
