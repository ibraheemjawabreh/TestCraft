import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/types'
import type { RecentUser } from '@/lib/admin/dashboard'

interface RecentUsersProps {
  dictionary: Dictionary
  locale: Locale
  users: RecentUser[]
}

export function RecentUsers({ dictionary, locale, users }: RecentUsersProps) {
  const t = dictionary.admin.dashboard
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <Card className="border-border/50 bg-card/70">
      <CardHeader>
        <CardTitle className="text-lg">{t.recentUsers}</CardTitle>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noData}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.user}</TableHead>
                <TableHead>{t.role}</TableHead>
                <TableHead>{t.xp}</TableHead>
                <TableHead>{t.level}</TableHead>
                <TableHead>{t.createdAt}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.totalXp ?? 0}</TableCell>
                  <TableCell>{user.currentLevel ?? 1}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {user.createdAt ? dateFormatter.format(new Date(user.createdAt)) : t.noData}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
