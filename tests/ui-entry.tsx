import React from 'react'
import {createRoot} from 'react-dom/client'
import {en} from '../src/i18n/dictionaries/en'
import {ar} from '../src/i18n/dictionaries/ar'
import {CurriculumFactory} from '../src/components/admin/curriculum/curriculum-factory'
import {ImportCurriculum,downloadCurriculum} from '../src/components/admin/curriculum/import-curriculum'
import {CurriculumDeleteDialog} from '../src/components/admin/curriculum/curriculum-delete-dialog'
import {LessonPracticeEditor} from '../src/components/admin/curriculum/lesson-practice-editor'
import {LessonViewer} from '../src/components/academy/learning/lesson-viewer'
import {LessonActivities} from '../src/components/academy/learning/lesson-activities'
import {PracticalAppRenderer} from '../src/components/practical-apps/PracticalAppRenderer'
import {BugReportForm} from '../src/components/academy/challenges/bug-report-form'
import {MyChallengeReports} from '../src/components/academy/challenges/my-challenge-reports'
import {ReviewForm} from '../src/components/admin/challenges/review-form'
const f=(window as any).__FIXTURE__,locale=f.locale as 'en'|'ar',dictionary=locale==='ar'?ar:en
document.documentElement.dir=locale==='ar'?'rtl':'ltr'
function DeleteFixture(){
 const [open,setOpen]=React.useState(true),[result,setResult]=React.useState<any>(null)
 return <>
  <button onClick={()=>setOpen(true)}>Open deletion dialog</button>
  {open&&<CurriculumDeleteDialog target={f.target} locale={locale} onClose={()=>setOpen(false)} onDeleted={value=>{setResult(value);setOpen(false)}}/>}
  {result&&<div role="status">{locale==='ar'?'تم حذف المحتوى وحفظ نسخة احتياطية.':'Content deleted. A backup was saved.'}<button onClick={()=>downloadCurriculum('backup',result.backup_id)}>{locale==='ar'?'تنزيل نسخة ما قبل الحذف':'Download pre-deletion backup'}</button></div>}
 </>
}
function App(){
 return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
  <p className="text-xs text-muted-foreground">Isolated UI fixture · no live account or model</p>
  {f.view==='admin'&&<CurriculumFactory dictionary={dictionary} locale={locale}/>}
  {f.view==='import'&&<ImportCurriculum locale={locale}/>}
  {f.view==='delete'&&<DeleteFixture/>}
  {f.view==='practice'&&<LessonPracticeEditor lessonId={f.lesson.id} initial={f.practice} updatedAt={f.lesson.updated_at} published={f.lesson.is_published} locale={locale} dictionary={dictionary}/>}
  {f.view==='lesson'&&<><LessonViewer lesson={f.lesson} dictionary={dictionary} locale={locale}/><LessonActivities lessonId={f.lesson.id} dictionary={dictionary} locale={locale}/></>}
  {f.view==='lab'&&<><PracticalAppRenderer appKey={f.app} challengeId={f.challenge.id} config={{validEmail:'qa.tester@testcraft.dev',validPassword:'Test@12345'}} dictionary={dictionary} locale={locale}/>
   <BugReportForm challengeId={f.challenge.id} labTemplateId={null} dictionary={dictionary}/>
   <MyChallengeReports reports={f.reports} locale={locale} dictionary={dictionary}/></>}
  {f.view==='review'&&<ReviewForm attemptData={f.review} dictionary={dictionary} locale={locale}/>}
 </main>
}
createRoot(document.getElementById('root')!).render(<App/>)

