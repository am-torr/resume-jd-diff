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

/* ------------------------------------------------------------------ */
/* JD Diff (evidence diff) shared model                                */
/* Used by both the server engine (server/jdDiffEngine.ts) and the UI. */
/* Shapes follow docs/jd-diff-prd.md sections 6, 7, 8, 11 and 15.      */
/* ------------------------------------------------------------------ */

export type MatchStatus = 'MATCH' | 'PARTIAL' | 'TRANSFERABLE' | 'HIDDEN_MATCH' | 'GAP' | 'CLAIM_RISK'

export const MATCH_STATUSES: readonly MatchStatus[] = ['MATCH', 'PARTIAL', 'TRANSFERABLE', 'HIDDEN_MATCH', 'GAP', 'CLAIM_RISK']

export type ActionType =
  | 'KEEP'
  | 'SURFACE_EARLIER'
  | 'STRENGTHEN_WORDING'
  | 'ADD_EXISTING_EVIDENCE'
  | 'DO_NOT_CLAIM'
  | 'LEARNING_TARGET'
  | 'INTERVIEW_PREP'
  | 'NO_ACTION'

export const ACTION_TYPES: readonly ActionType[] = [
  'KEEP',
  'SURFACE_EARLIER',
  'STRENGTHEN_WORDING',
  'ADD_EXISTING_EVIDENCE',
  'DO_NOT_CLAIM',
  'LEARNING_TARGET',
  'INTERVIEW_PREP',
  'NO_ACTION',
]

export type RequirementCategory =
  | 'RESPONSIBILITY'
  | 'REQUIRED_SKILL'
  | 'PREFERRED_SKILL'
  | 'TECHNOLOGY'
  | 'SENIORITY'
  | 'OPERATIONS'
  | 'DOMAIN'

export type RequirementImportance = 'REQUIRED' | 'PREFERRED' | 'RESPONSIBILITY' | 'CONTEXT'

export type JDRequirement = {
  id: string
  /** Verbatim phrase from the job description (for display). */
  originalText: string
  /** Canonical concept id after alias normalization (e.g. "postgresql" for "Postgres"). */
  normalizedConcept?: string
  category: RequirementCategory
  importance: RequirementImportance
  sourceSection?: string
  /** Verbatim JD line the phrase came from (traceability). */
  sourceText?: string
  /** How many times the JD mentioned this requirement before de-duplication. */
  occurrences?: number
}

export type ResumeEvidence = {
  id: string
  /** Verbatim substring of the resume input. Never rewritten or strengthened. */
  originalText: string
  sourceSection?: string
  employerOrProject?: string
  normalizedConcepts?: string[]
  /** 1-based line number in the resume input. */
  lineNumber?: number
}

/** Which matching layer produced the status (PRD section 9). */
export type MatchLayer = 'EXACT' | 'ALIAS' | 'FAMILY' | 'CAPABILITY' | 'KEYWORD' | 'NONE'

export type EvidenceMatch = {
  requirement: JDRequirement
  evidence: ResumeEvidence[]
  status: MatchStatus
  reason: string
  action: ActionType
  matchLayer?: MatchLayer
}

export type JDDiffSummary = Record<MatchStatus, number> & { total: number }

export type JDDiffAnalysis = {
  requirements: JDRequirement[]
  evidence: ResumeEvidence[]
  matches: EvidenceMatch[]
  summary: JDDiffSummary
  warnings: string[]
}

export type JDInputSource = {
  name: string
  kind: 'paste' | 'docx' | 'pdf'
  characters: number
}

export type JDDiffResult = JDDiffAnalysis & {
  comparedAt: string
  resumeSource: JDInputSource
  jdSource: JDInputSource
  /** The exact resume text the engine analyzed; every evidence originalText is a substring of it. */
  resumeText: string
  jdText: string
}
