import express from 'express'
import multer from 'multer'
import { compareDocuments } from './resumeEngine.ts'

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

app.listen(port, () => {
  console.log(`Resume Diff Viewer API running on http://localhost:${port}`)
})
