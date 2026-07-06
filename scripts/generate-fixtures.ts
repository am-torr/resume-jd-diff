import { createWriteStream } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx'
import PDFDocument from 'pdfkit'
import { fixtures, type Fixture } from './fixture-data.ts'

const outputDir = path.resolve('fixtures/generated')

await mkdir(outputDir, { recursive: true })

for (const fixture of fixtures) {
  await writeDocx(fixture)
  await writePdf(fixture)
}

await writeTableHeavyDocx()
await writeTableHeavyPdf()

console.log(`Generated ${fixtures.length * 2 + 2} files in ${outputDir}`)

async function writeDocx(fixture: Fixture): Promise<void> {
  const document = new Document({
    sections: [
      {
        children: fixture.lines.map((line) => {
          const isHeading = isHeadingLine(line)
          return new Paragraph({
            children: [
              new TextRun({
                text: line,
                bold: isHeading,
                size: isHeading ? 26 : 22,
              }),
            ],
            spacing: { after: isHeading ? 120 : 80 },
          })
        }),
      },
    ],
  })
  const buffer = await Packer.toBuffer(document)
  await writeFile(path.join(outputDir, `${fixture.name}.docx`), buffer)
}

async function writePdf(fixture: Fixture): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const document = new PDFDocument({ margin: 48 })
    const stream = createWriteStream(path.join(outputDir, `${fixture.name}.pdf`))
    stream.on('finish', resolve)
    stream.on('error', reject)
    document.pipe(stream)

    for (const line of fixture.lines) {
      const isHeading = isHeadingLine(line)
      document.font(isHeading ? 'Helvetica-Bold' : 'Helvetica')
      document.fontSize(isHeading ? 13 : 10.5)
      document.text(line)
      document.moveDown(isHeading ? 0.35 : 0.2)
    }

    document.end()
  })
}

async function writeTableHeavyDocx(): Promise<void> {
  const skillRows = [
    ['Frontend', 'React, Vue.js, TypeScript, Tailwind CSS'],
    ['Backend', 'Node.js, Python, Go, REST APIs'],
    ['Database', 'PostgreSQL, MongoDB, Redis'],
    ['Cloud', 'AWS, GCP, Docker, Kubernetes'],
  ]
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ children: [new TextRun({ text: 'Alex Torres', bold: true, size: 28 })] }),
        new Paragraph({ children: [new TextRun({ text: 'alex@example.com | 555-777-8888' })] }),
        new Paragraph({}),
        new Paragraph({ children: [new TextRun({ text: 'TECHNICAL SKILLS', bold: true, size: 26 })] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: skillRows.map(([category, skills]) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: category, bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: skills })] })] }),
              ],
            }),
          ),
        }),
        new Paragraph({}),
        new Paragraph({ children: [new TextRun({ text: 'EXPERIENCE', bold: true, size: 26 })] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Software Engineer' })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pinnacle Tech' })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '2020 - Present' })] })] }),
              ],
            }),
          ],
        }),
        new Paragraph({ children: [new TextRun({ text: '- Built microservices handling 100K daily requests.' })] }),
        new Paragraph({}),
        new Paragraph({ children: [new TextRun({ text: 'EDUCATION', bold: true, size: 26 })] }),
        new Paragraph({ children: [new TextRun({ text: 'B.S. Computer Science, Tech University | 2020' })] }),
      ],
    }],
  })
  const buffer = await Packer.toBuffer(doc)
  await writeFile(path.join(outputDir, 'table-heavy.docx'), buffer)
}

async function writeTableHeavyPdf(): Promise<void> {
  const skillRows = [
    ['Frontend', 'React, Vue.js, TypeScript, Tailwind CSS'],
    ['Backend', 'Node.js, Python, Go, REST APIs'],
    ['Database', 'PostgreSQL, MongoDB, Redis'],
    ['Cloud', 'AWS, GCP, Docker, Kubernetes'],
  ]
  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 })
    const stream = createWriteStream(path.join(outputDir, 'table-heavy.pdf'))
    stream.on('finish', resolve)
    stream.on('error', reject)
    doc.pipe(stream)
    doc.font('Helvetica-Bold').fontSize(14).text('Alex Torres')
    doc.font('Helvetica').fontSize(10.5).text('alex@example.com | 555-777-8888')
    doc.moveDown(0.5)
    doc.font('Helvetica-Bold').fontSize(13).text('TECHNICAL SKILLS')
    doc.font('Helvetica').fontSize(10.5)
    for (const [category, skills] of skillRows) {
      doc.text(`${category}    ${skills}`)
      doc.moveDown(0.2)
    }
    doc.moveDown(0.3)
    doc.font('Helvetica-Bold').fontSize(13).text('EXPERIENCE')
    doc.font('Helvetica').fontSize(10.5).text('Software Engineer    Pinnacle Tech    2020 - Present')
    doc.text('- Built microservices handling 100K daily requests.')
    doc.moveDown(0.3)
    doc.font('Helvetica-Bold').fontSize(13).text('EDUCATION')
    doc.font('Helvetica').fontSize(10.5).text('B.S. Computer Science, Tech University | 2020')
    doc.end()
  })
}

function isHeadingLine(line: string): boolean {
  return line === line.toUpperCase() && line.length <= 32 && !line.includes('@')
}
