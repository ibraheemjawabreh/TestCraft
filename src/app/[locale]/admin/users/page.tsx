import { getAdminUsers } from '@/lib/admin/users'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import { Users as UsersIcon } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FormattedDate } from '@/components/ui/formatted-date'

interface AdminUsersPageProps {
  params: {
    locale: Locale
  }
}

export default async function AdminUsersPage({ params: { locale } }: AdminUsersPageProps) {
  const dictionary = await getDictionary(locale)
  const result = await getAdminUsers()
  const t = dictionary.admin.users
  const tDash = dictionary.admin.dashboard

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <UsersIcon className="h-8 w-8 text-primary" />
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
        <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.username}</TableHead>
                <TableHead>{t.role}</TableHead>
                <TableHead>{t.totalXp}</TableHead>
                <TableHead>{t.currentLevel}</TableHead>
                <TableHead>{t.createdAt}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {t.noUsers}
                  </TableCell>
                </TableRow>
              ) : (
                result.data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={user.avatarUrl} 
                            alt={user.username} 
                            className="w-8 h-8 rounded-full border bg-muted" 
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full border bg-muted/50 flex items-center justify-center">
                            <span className="text-xs text-muted-foreground uppercase">
                              {user.username.slice(0, 2)}
                            </span>
                          </div>
                        )}
                        {user.username}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.totalXp ?? 0}</TableCell>
                    <TableCell>{user.currentLevel ?? 1}</TableCell>
                    <TableCell>
                      {user.createdAt ? (
                        <FormattedDate value={user.createdAt} locale={locale} dateStyle="medium" />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
