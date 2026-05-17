import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '../public/sample.pdf')

const doc = await PDFDocument.create()
const page = doc.addPage([595, 842])
const font = await doc.embedFont(StandardFonts.Helvetica)
const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

const { height } = page.getSize()

page.drawText('projectPLATFORM', {
  x: 50,
  y: height - 80,
  size: 28,
  font: fontBold,
  color: rgb(0.1, 0.1, 0.2),
})

page.drawText('Sample PDF for react-pdf', {
  x: 50,
  y: height - 120,
  size: 16,
  font,
  color: rgb(0.3, 0.3, 0.4),
})

page.drawText('If you see this page, the library works.', {
  x: 50,
  y: height - 160,
  size: 12,
  font,
})

page.drawText(`Generated: ${new Date().toISOString()}`, {
  x: 50,
  y: 80,
  size: 10,
  font,
  color: rgb(0.5, 0.5, 0.5),
})

const bytes = await doc.save()
writeFileSync(outPath, bytes)
console.log(`Created ${outPath} (${bytes.length} bytes)`)
