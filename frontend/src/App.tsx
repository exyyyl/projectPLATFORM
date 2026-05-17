import { useQuery } from '@tanstack/react-query'

import { PdfViewer } from '@/components/examples/pdf-viewer'
import { RichTextEditor } from '@/components/examples/rich-text-editor'
import { SampleForm } from '@/components/examples/sample-form'
import { SampleTable } from '@/components/examples/sample-table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { apiFetch } from '@/lib/api'
import { QueryProvider } from '@/providers/query-provider'

type HealthResponse = { status: string; timestamp: string }

function Dashboard() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<HealthResponse>('/health'),
  })

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-semibold">projectPLATFORM</h1>
          <span className="text-sm text-muted-foreground">
            API:{' '}
            {health.isLoading
              ? 'проверка...'
              : health.isError
                ? 'недоступен'
                : health.data?.status}
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 p-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>React Hook Form + Zod</CardTitle>
            <CardDescription>Формы с валидацией</CardDescription>
          </CardHeader>
          <CardContent>
            <SampleForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>TanStack Table</CardTitle>
            <CardDescription>Таблицы данных</CardDescription>
          </CardHeader>
          <CardContent>
            <SampleTable />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>TipTap</CardTitle>
            <CardDescription>Rich-text редактор</CardDescription>
          </CardHeader>
          <CardContent>
            <RichTextEditor />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>react-pdf</CardTitle>
            <CardDescription>PDF-просмотр</CardDescription>
          </CardHeader>
          <CardContent>
            <PdfViewer />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <QueryProvider>
      <Dashboard />
    </QueryProvider>
  )
}
