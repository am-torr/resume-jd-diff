import { UploadCloud } from 'lucide-react'

// Shared by Resume Diff and JD Diff so both modes use the same upload control and validation copy.
export function FilePicker({
  label,
  file,
  onChange,
  testId,
  hint = 'Word-to-Word, Word-to-PDF, PDF-to-Word, PDF-to-PDF',
}: {
  label: string
  file: File | null
  onChange: (files: FileList | null) => void
  testId: string
  hint?: string
}) {
  return (
    <label className="file-picker">
      <input
        type="file"
        accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(event) => onChange(event.currentTarget.files)}
        data-testid={testId}
      />
      <UploadCloud size={24} aria-hidden="true" />
      <span>{label}</span>
      <strong>{file ? file.name : 'Choose .docx or .pdf'}</strong>
      <small>{file ? `${formatBytes(file.size)} selected` : hint}</small>
    </label>
  )
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
