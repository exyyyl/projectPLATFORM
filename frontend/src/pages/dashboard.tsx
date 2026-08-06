import { PdfViewer } from '@/components/examples/pdf-viewer'
import { RichTextEditor } from '@/components/examples/rich-text-editor'
import { SampleForm } from '@/components/examples/sample-form'
import { SampleTable } from '@/components/examples/sample-table'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function DashboardPage() {
  return (
    <section className="space-y-6" aria-label="Демонстрация компонентов">
      <div className="grid gap-6 @4xl:grid-cols-2">
        <ErrorBoundary>
          <Card>
            <CardHeader>
              <CardTitle>React Hook Form + Zod</CardTitle>
              <CardDescription>Формы с валидацией</CardDescription>
            </CardHeader>
            <CardContent>
              <SampleForm />
            </CardContent>
          </Card>
        </ErrorBoundary>

        <ErrorBoundary>
          <Card>
            <CardHeader>
              <CardTitle>TanStack Table</CardTitle>
              <CardDescription>Таблицы данных</CardDescription>
            </CardHeader>
            <CardContent>
              <SampleTable />
            </CardContent>
          </Card>
        </ErrorBoundary>

        <ErrorBoundary>
          <Card>
            <CardHeader>
              <CardTitle>TipTap</CardTitle>
              <CardDescription>Rich-text редактор</CardDescription>
            </CardHeader>
            <CardContent>
              <RichTextEditor />
            </CardContent>
          </Card>
        </ErrorBoundary>

        <ErrorBoundary>
          <Card>
            <CardHeader>
              <CardTitle>react-pdf</CardTitle>
              <CardDescription>PDF-просмотр</CardDescription>
            </CardHeader>
            <CardContent>
              <PdfViewer />
            </CardContent>
          </Card>
        </ErrorBoundary>
      </div>
    </section>
  )
}
