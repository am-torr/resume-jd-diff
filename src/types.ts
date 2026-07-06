export type CanonicalSection =
  | 'Contact'
  | 'Summary'
  | 'Experience'
  | 'Skills'
  | 'Education'
  | 'Projects'
  | 'Certifications'
  | 'Awards'
  | 'Publications'
  | 'Research'
  | 'Volunteer'
  | 'Other'

export type ExtractionConfidence = 'Good' | 'Needs Review' | 'Likely Problematic'
export type RiskCategory = 'Contact' | 'Metrics' | 'Dates' | 'Skills' | 'Sections' | 'PDF Quality'
export type QualityStatus = 'Pass' | 'Warning' | 'Needs Review'
export type RiskSeverity = 'info' | 'warning' | 'critical'

export type DiffPart = {
  value: string
  added?: boolean
  removed?: boolean
  count: number
}

export type SectionDiff = {
  section: CanonicalSection
  status: 'unchanged' | 'changed' | 'added' | 'removed'
  originalText: string
  revisedText: string
  insertedWords: number
  deletedWords: number
  changedHighlights: string[]
}

export type DocumentAnalysis = {
  sections: Array<{
    canonical: CanonicalSection
    heading: string
    content: string
    confidence: number
  }>
  headingMappings: Array<{
    heading: string
    canonical: CanonicalSection
    confidence: number
    signals: string[]
  }>
  formatType: string
  quality: QualityStatus
  warnings: string[]
  contacts: {
    emails: string[]
    phones: string[]
    urls: string[]
  }
  skills: string[]
  dates: string[]
  numbers: string[]
  titlesAndCompanies: string[]
}

export type ExtractedDocument = {
  fileName: string
  fileType: 'docx' | 'pdf'
  rawText: string
  normalizedText: string
  lines: string[]
  warnings: string[]
  extractionConfidence: ExtractionConfidence
  analysis: DocumentAnalysis
}

export type CompareResult = {
  comparedAt: string
  pairing: string
  original: ExtractedDocument
  revised: ExtractedDocument
  diff: {
    insertedWords: number
    deletedWords: number
    unchangedWords: number
    parts: DiffPart[]
  }
  sectionDiffs: SectionDiff[]
  risks: Array<{
    severity: RiskSeverity
    category: RiskCategory
    title: string
    detail: string
  }>
  summary: {
    status: QualityStatus
    headline: string
    changedSections: number
    riskCount: number
    isNoChange: boolean
  }
}
