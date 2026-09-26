/**
 * PUBLIC DEMO ENGINE
 *
 * The production resume engine (section detection, heading-synonym mapping,
 * resume risk rules) is proprietary and is not included in this repository.
 * This stub keeps the app runnable end to end with basic text extraction
 * and a plain word diff, so the UI, API and launcher can be evaluated.
 */
import mammoth from 'mammoth'
import { diffWords } from 'diff'
import type {
  CanonicalSection,
  CompareResult,
  DiffPart,
  DocumentAnalysis,
  ExtractedDocument,
} from '../src/types.ts'

export type UploadedFile = {
  originalname: string
  mimetype: string
  buffer: Buffer
  size: number
}

const DEMO_WARNING = 'Public demo engine: section detection and risk checks are simplified.'

export async function extractDocument(file: UploadedFile): Promise<ExtractedDocument> {
  const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')
  const rawText = isPdf
    ? await extractPdfText(file.buffer)
    : (await mammoth.extractRawText({ buffer: file.buffer })).value
  const normalizedText = normalizeText(rawText)
  const lines = normalizedText.split('\n').filter((line) => line.trim().length > 0)

  return {
    fileName: file.originalname,
    fileType: isPdf ? 'pdf' : 'docx',
    rawText,
    normalizedText,
    lines,
    warnings: [DEMO_WARNING],
    extractionConfidence: lines.length > 0 ? 'Good' : 'Likely Problematic',
    analysis: analyzeDocument(normalizedText),
  }
}

export function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function detectHeadings(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 2 && line.length < 40 && /[A-Z]/.test(line) && line === line.toUpperCase())
}

export function analyzeDocument(text: string): DocumentAnalysis {
  const section: CanonicalSection = 'Other'
  return {
    sections: [{ canonical: section, heading: 'Document', content: text, confidence: 0.5 }],
    headingMappings: detectHeadings(text).map((heading) => ({
      heading,
      canonical: section,
      confidence: 0.5,
      signals: ['demo'],
    })),
    formatType: 'unknown',
    quality: 'Needs Review',
    warnings: [DEMO_WARNING],
    contacts: {
      emails: text.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [],
      phones: [],
      urls: [],
    },
    skills: [],
    dates: [],
    numbers: [],
    titlesAndCompanies: [],
  }
}

export async function compareDocuments(original: UploadedFile, revised: UploadedFile): Promise<CompareResult> {
  const [a, b] = await Promise.all([extractDocument(original), extractDocument(revised)])
  const parts: DiffPart[] = diffWords(a.normalizedText, b.normalizedText).map((part) => ({
    value: part.value,
    added: part.added,
    removed: part.removed,
    count: part.count ?? 0,
  }))
  const total = (keep: (part: DiffPart) => boolean) =>
    parts.filter(keep).reduce((sum, part) => sum + part.count, 0)

  const insertedWords = total((part) => Boolean(part.added))
  const deletedWords = total((part) => Boolean(part.removed))
  const unchangedWords = total((part) => !part.added && !part.removed)
  const changed = insertedWords + deletedWords > 0

  return {
    comparedAt: new Date().toISOString(),
    pairing: `${a.fileType} -> ${b.fileType}`,
    original: a,
    revised: b,
    diff: { insertedWords, deletedWords, unchangedWords, parts },
    sectionDiffs: [
      {
        section: 'Other',
        status: changed ? 'changed' : 'unchanged',
        originalText: a.normalizedText,
        revisedText: b.normalizedText,
        insertedWords,
        deletedWords,
        changedHighlights: [],
      },
    ],
    risks: [],
    summary: {
      status: changed ? 'Warning' : 'Pass',
      headline: changed ? 'Changes detected (public demo engine)' : 'No changes detected',
      changedSections: changed ? 1 : 0,
      riskCount: 0,
      isNoChange: !changed,
    },
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const candidates = ['pdfjs-dist/legacy/build/pdf.mjs', 'pdfjs-dist']
  let lastError: unknown
  for (const modulePath of candidates) {
    try {
      const pdfjs = await import(modulePath)
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise
      const pages: string[] = []
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
        const page = await doc.getPage(pageNumber)
        const content = await page.getTextContent()
        pages.push(content.items.map((item: { str?: string }) => item.str ?? '').join(' '))
      }
      return pages.join('\n')
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Unable to read PDF text.')
}
