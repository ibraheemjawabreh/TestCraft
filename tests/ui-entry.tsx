import React from 'react'
import {createRoot} from 'react-dom/client'
import {en} from '../src/i18n/dictionaries/en'
import {ar} from '../src/i18n/dictionaries/ar'
import {CurriculumFactory} from '../src/components/admin/curriculum/curriculum-factory'
import {LessonViewer} from '../src/components/academy/learning/lesson-viewer'
import {LessonActivities} from '../src/components/academy/learning/lesson-activities'
import {PracticalAppRenderer} from '../src/components/practical-apps/PracticalAppRenderer'
import {BugReportForm} from '../src/components/academy/challenges/bug-report-form'
import {MyChallengeReports} from '../src/components/academy/challenges/my-challenge-reports'
import {ReviewForm} from '../src/components/admin/challenges/review-form'
const f=(window as any).__FIXTURE__,locale=f.locale as 'en'|'ar',dictionary=locale==='ar'?ar:en
document.documentElement.dir=locale==='ar'?'rtl':'ltr'
function App(){
 return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
  <p className="text-xs text-muted-foreground">Isolated UI fixture · no live account or model</p>
  {f.view==='admin'&&<CurriculumFactory dictionary={dictionary} locale={locale}/>}
  {f.view==='lesson'&&<><LessonViewer lesson={f.lesson} dictionary={dictionary} locale={locale}/><LessonActivities lessonId={f.lesson.id} dictionary={dictionary} locale={locale}/></>}
  {f.view==='lab'&&<><PracticalAppRenderer appKey={f.app} challengeId={f.challenge.id} config={{validEmail:'qa.tester@testcraft.dev',validPassword:'Test@12345'}} dictionary={dictionary} locale={locale}/>
   <BugReportForm challengeId={f.challenge.id} labTemplateId={null} dictionary={dictionary}/>
   <MyChallengeReports reports={f.reports} locale={locale} dictionary={dictionary}/></>}
  {f.view==='review'&&<ReviewForm attemptData={f.review} dictionary={dictionary} locale={locale}/>}
 </main>
}
createRoot(document.getElementById('root')!).render(<App/>)

