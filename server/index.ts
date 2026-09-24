import express from 'express'
import multer from 'multer'
import type { JDDiffResult, JDInputSource } from '../src/types.ts'
import { compareResumeToJobDescription } from './jdDiffEngine.ts'
import { compareDocuments, extractDocument } from './resumeEngine.ts'

const app = express()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,
  },
})
const port = Number(process.env.PORT ?? 4174)

app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.post(
  '/api/compare',
  upload.fields([
    { name: 'original', maxCount: 1 },
    { name: 'revised', maxCount: 1 },
  ]),
  async (request, response) => {
    try {
      const files = request.files as Record<string, Express.Multer.File[]> | undefined
      const original = files?.original?.[0]
      const revised = files?.revised?.[0]

      if (!original || !revised) {
        response.status(400).json({ error: 'Upload an original and revised file.' })
        return
      }

      const result = await compareDocuments(original, revised)
      response.json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to compare documents.'
      response.status(400).json({ error: message })
    }
  },
)

// JD Diff: each side may be an uploaded .docx/.pdf (parsed with the same local extractor as Resume Diff)
// or pasted text. Nothing leaves this process.
const MAX_PASTE_CHARS = 200_000

app.post(
  '/api/jd-diff',
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'jd', maxCount: 1 },
  ]),
  async (request, response) => {
    try {
      const files = request.files as Record<string, Express.Multer.File[]> | undefined
      const body = (request.body ?? {}) as Record<string, unknown>
      const [resume, jd] = await Promise.all([
        readJdDiffInput(files?.resume?.[0], body.resumeText, 'Resume'),
        readJdDiffInput(files?.jd?.[0], body.jdText, 'Job description'),
      ])

      if (!resume.text.trim()) {
        response.status(400).json({ error: 'Provide a resume: upload a .docx or text-based .pdf, or paste the text.' })
        return
      }
      if (!jd.text.trim()) {
        response.status(400).json({ error: 'Provide a job description: paste the text, or upload a .docx or text-based .pdf.' })
        return
      }

      const analysis = compareResumeToJobDescription(resume.text, jd.text)
      const result: JDDiffResult = {
        ...analysis,
        comparedAt: new Date().toISOString(),
        resumeSource: resume.source,
        jdSource: jd.source,
        resumeText: resume.text,
        jdText: jd.text,
      }
      response.json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to compare the resume with the job description.'
      response.status(400).json({ error: message })
    }
  },
)

async function readJdDiffInput(
  file: Express.Multer.File | undefined,
  pasted: unknown,
  label: string,
): Promise<{ text: string; source: JDInputSource }> {
  if (file) {
    const document = await extractDocument(file)
    return {
      text: document.normalizedText,
      source: { name: file.originalname, kind: document.fileType, characters: document.normalizedText.length },
    }
  }
  const text = typeof pasted === 'string' ? pasted : ''
  if (text.length > MAX_PASTE_CHARS) {
    throw new Error(`${label} text is too long (limit ${MAX_PASTE_CHARS.toLocaleString('en-US')} characters).`)
  }
  return { text, source: { name: `Pasted ${label.toLowerCase()}`, kind: 'paste', characters: text.length } }
}

app.listen(port, () => {
  console.log(`Resume Diff Viewer API running on http://localhost:${port}`)
})
