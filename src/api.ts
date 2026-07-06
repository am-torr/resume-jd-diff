import type { CompareResult } from './types'

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
