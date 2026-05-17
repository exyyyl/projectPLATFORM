import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

export function PdfViewer() {
  const [numPages, setNumPages] = useState(0)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="rounded-md border p-4 text-sm text-muted-foreground">
      <p className="mb-2">PDF-просмотр (react-pdf)</p>
      <Document
        file="/sample.pdf"
        onLoadSuccess={({ numPages: n }) => {
          setNumPages(n)
          setError(null)
        }}
        onLoadError={(err) => {
          setNumPages(0)
          setError(err.message)
        }}
        loading={<span>Загрузка...</span>}
        error={
          <span className="text-destructive">
            {error ?? 'Не удалось загрузить PDF'}
          </span>
        }
      >
        {numPages > 0 && <Page pageNumber={1} width={400} />}
      </Document>
    </div>
  )
}
