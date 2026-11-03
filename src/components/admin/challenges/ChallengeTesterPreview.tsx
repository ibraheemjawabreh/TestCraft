'use client'
import {useFormContext} from 'react-hook-form'
import type {PracticalChallengeFormValues} from '@/lib/validations/practical-challenge'
import type {Dictionary} from '@/i18n/types'
import {PracticalAppRenderer} from '@/components/practical-apps/PracticalAppRenderer'
export function ChallengeTesterPreview({dictionary,locale}:{dictionary:Dictionary;locale:'en'|'ar'}){
 const form=useFormContext<PracticalChallengeFormValues>(),t=dictionary.factory.lab
 const key=form.watch('practical_app_key')
 if(!key)return null
 return <section className="space-y-3 rounded-xl border p-4" dir={locale==='ar'?'rtl':'ltr'}>
  <h2 className="text-lg font-semibold">{t.preview}</h2><p className="text-sm text-muted-foreground">{t.previewHint}</p>
  <PracticalAppRenderer appKey={key} config={form.watch('practical_app_config')} activeBugs={(form.watch('embedded_bugs')||[]).filter(b=>b.is_active).map(b=>b.bug_key)} dictionary={dictionary} locale={locale}/>
 </section>
}

