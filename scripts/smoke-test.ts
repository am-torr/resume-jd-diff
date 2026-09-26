import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { compareDocuments } from '../server/resumeEngine.ts'

const fixtureDir = path.resolve('fixtures/generated')
const cases = [
  ['chronological-original.docx', 'chronological-revised.docx'],
  ['chronological-original.docx', 'chronological-revised.pdf'],
  ['chronological-original.pdf', 'chronological-revised.docx'],
  ['chronological-original.pdf', 'chronological-revised.pdf'],
]

for (const [originalName, revisedName] of cases) {
  const result = await compareDocuments(
    await readFixture(originalName),
    await readFixture(revisedName),
  )

  if (result.diff.insertedWords === 0 || result.diff.deletedWords === 0) {
    throw new Error(`${originalName} -> ${revisedName} did not detect word changes.`)
  }
  if (result.sectionDiffs.length === 0) {
    throw new Error(`${originalName} -> ${revisedName} did not produce section diffs.`)
  }

  console.log(`${originalName} -> ${revisedName}: ${result.summary.status}, ${result.summary.changedSections} changed sections`)
}

async function readFixture(fileName: string) {
  const buffer = await readFile(path.join(fixtureDir, fileName))
  return {
    originalname: fileName,
    mimetype: fileName.endsWith('.pdf')
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer,
    size: buffer.byteLength,
  }
}
