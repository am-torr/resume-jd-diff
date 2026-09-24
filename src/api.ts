import type { CompareResult, JDDiffResult } from './types'

export async function compareFiles(original: File, revised: File): Promise<CompareResult> {
  const formData = new FormData()
  formData.append('original', original)
  formData.append('revised', revised)

  const response = await fetch('/api/compare', {
    method: 'POST',
    body: formData,
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to compare files.')
  }

  return payload as CompareResult
}

export function isSupportedFile(file: File): boolean {
  return /\.(docx|pdf)$/i.test(file.name)
}

export type JDDiffInput = { file: File | null; text: string }

/**
 * Sends the resume and job description to the LOCAL API (same Express process as Resume Diff).
 * A chosen file wins over pasted text for that side.
 */
export async function compareResumeToJD(resume: JDDiffInput, jd: JDDiffInput): Promise<JDDiffResult> {
  const formData = new FormData()
  if (resume.file) formData.append('resume', resume.file)
  else formData.append('resumeText', resume.text)
  if (jd.file) formData.append('jd', jd.file)
  else formData.append('jdText', jd.text)

  const response = await fetch('/api/jd-diff', {
    method: 'POST',
    body: formData,
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to compare the resume with the job description.')
  }

  return payload as JDDiffResult
}
