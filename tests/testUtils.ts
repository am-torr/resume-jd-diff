import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { UploadedFile } from '../server/resumeEngine.ts'

export const fixtureDir = path.resolve('fixtures/generated')

export async function readFixture(fileName: string): Promise<UploadedFile> {
  const buffer = await readFile(path.join(fixtureDir, fileName))
  return fileFromBuffer(fileName, buffer)
}

export function fileFromBuffer(fileName: string, buffer: Buffer): UploadedFile {
  return {
    originalname: fileName,
    mimetype: fileName.endsWith('.pdf')
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer,
    size: buffer.byteLength,
  }
}
