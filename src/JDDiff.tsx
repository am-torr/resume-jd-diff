import { ArrowRightLeft, CircleCheck, CircleDashed, CircleX, EyeOff, FileSearch, RefreshCw, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { RefObject } from 'react'
import { useId, useRef, useState } from 'react'
import { compareResumeToJD, isSupportedFile, type JDDiffInput } from './api'
import { FilePicker } from './FilePicker'
import type { ActionType, EvidenceMatch, JDDiffResult, MatchStatus, RequirementImportance } from './types'

type Side = 'resume' | 'jd'
type SourceMode = 'upload' | 'paste'
type SideState = JDDiffInput & { source: SourceMode }
type FilterId = 'all' | 'matches' | 'partial' | 'transferable' | 'hidden' | 'gaps' | 'risks'

const UNSUPPORTED_FILE = 'V1 supports .docx and text-based .pdf files only.'

const STATUS_META: Record<MatchStatus, { label: string; icon: LucideIcon; countLabel: [string, string] }> = {
  MATCH: { label: 'MATCH', icon: CircleCheck, countLabel: ['direct match', 'direct matches'] },
  PARTIAL: { label: 'PARTIAL', icon: CircleDashed, countLabel: ['partial match', 'partial matches'] },
  TRANSFERABLE: { label: 'TRANSFERABLE', icon: ArrowRightLeft, countLabel: ['transferable capability', 'transferable capabilities'] },
  HIDDEN_MATCH: { label: 'HIDDEN MATCH', icon: EyeOff, countLabel: ['hidden match', 'hidden matches'] },
  GAP: { label: 'GAP', icon: CircleX, countLabel: ['genuine gap', 'genuine gaps'] },
  CLAIM_RISK: { label: 'CLAIM RISK', icon: TriangleAlert, countLabel: ['claim risk', 'claim risks'] },
}

const SUMMARY_ORDER: MatchStatus[] = ['MATCH', 'PARTIAL', 'TRANSFERABLE', 'HIDDEN_MATCH', 'GAP', 'CLAIM_RISK']

const FILTERS: Array<{ id: FilterId; label: string; statuses: MatchStatus[] | null }> = [
  { id: 'all', label: 'ALL', statuses: null },
  { id: 'matches', label: 'MATCHES', statuses: ['MATCH'] },
  { id: 'partial', label: 'PARTIAL', statuses: ['PARTIAL'] },
  { id: 'transferable', label: 'TRANSFERABLE', statuses: ['TRANSFERABLE'] },
  { id: 'hidden', label: 'HIDDEN', statuses: ['HIDDEN_MATCH'] },
  { id: 'gaps', label: 'GAPS', statuses: ['GAP'] },
  { id: 'risks', label: 'RISKS', statuses: ['CLAIM_RISK'] },
]

const ACTION_LABELS: Record<ActionType, string> = {
  KEEP: 'Keep',
  SURFACE_EARLIER: 'Surface earlier',
  STRENGTHEN_WORDING: 'Strengthen wording',
  ADD_EXISTING_EVIDENCE: 'Add existing evidence',
  DO_NOT_CLAIM: 'Do not claim',
  LEARNING_TARGET: 'Learning target',
  INTERVIEW_PREP: 'Interview prep',
  NO_ACTION: 'No action',
}

const IMPORTANCE_LABELS: Record<RequirementImportance, string> = {
  REQUIRED: 'Required',
  PREFERRED: 'Preferred',
  RESPONSIBILITY: 'Responsibility',
  CONTEXT: 'Context',
}

const EMPTY_SIDE: SideState = { source: 'upload', file: null, text: '' }

export function JDDiffWorkspace({ hidden }: { hidden: boolean }) {
  const [resume, setResume] = useState<SideState>(EMPTY_SIDE)
  const [jd, setJd] = useState<SideState>({ ...EMPTY_SIDE, source: 'paste' })
  const [result, setResult] = useState<JDDiffResult | null>(null)
  const [error, setError] = useState('')
  const [isComparing, setIsComparing] = useState(false)
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null)

  function updateSide(side: Side, next: SideState) {
    setError('')
    setResult(null)
    if (side === 'resume') setResume(next)
    else setJd(next)
  }

  function handleFile(side: Side, current: SideState, files: FileList | null) {
    const file = files?.[0] ?? null
    if (file && !isSupportedFile(file)) {
      setError(UNSUPPORTED_FILE)
      return
    }
    updateSide(side, { ...current, file })
  }

  async function runCompare() {
    const resumeInput = activeInput(resume)
    const jdInput = activeInput(jd)
    if (!hasInput(resumeInput) || !hasInput(jdInput)) {
      setError('Provide both a resume and a job description: upload a .docx or text-based .pdf, or paste the text.')
      return
    }

    setError('')
    setIsComparing(true)
    try {
      const comparison = await compareResumeToJD(resumeInput, jdInput)
      setResult(comparison)
      // Move focus to the new results so keyboard and screen-reader users land on them.
      requestAnimationFrame(() => resultsHeadingRef.current?.focus())
    } catch (comparisonError) {
      setResult(null)
      setError(comparisonError instanceof Error ? comparisonError.message : 'Unable to compare the resume with the job description.')
    } finally {
      setIsComparing(false)
    }
  }

  return (
    <div className="jd-diff" hidden={hidden} data-testid="jd-diff-workspace">
      <section className="workspace" aria-label="JD Diff inputs">
        <div className="upload-grid">
          <InputPanel
            side="resume"
            title="Resume"
            state={resume}
            onSource={(source) => updateSide('resume', { ...resume, source })}
            onFile={(files) => handleFile('resume', resume, files)}
            onText={(text) => updateSide('resume', { ...resume, text })}
          />
          <InputPanel
            side="jd"
            title="Job Description"
            state={jd}
            onSource={(source) => updateSide('jd', { ...jd, source })}
            onFile={(files) => handleFile('jd', jd, files)}
            onText={(text) => updateSide('jd', { ...jd, text })}
          />
        </div>

        <div className="compare-strip">
          <div>
            <span className="pairing" data-testid="jd-pairing-label">
              {describeInput('Resume', resume)} vs {describeInput('Job description', jd)}
            </span>
            <p>Every non-gap result cites the resume lines behind it. Nothing is uploaded; parsing runs on this machine.</p>
          </div>
          <button className="primary-action" type="button" onClick={runCompare} disabled={isComparing} data-testid="jd-compare-button">
            {isComparing ? <RefreshCw className="spin" size={18} aria-hidden="true" /> : <FileSearch size={18} aria-hidden="true" />}
            {isComparing ? 'Comparing' : 'Compare with JD'}
          </button>
        </div>

        {error && <div className="error-banner" role="alert" data-testid="jd-error-banner">{error}</div>}
      </section>

      {result ? (
        <JDResults key={result.comparedAt} result={result} headingRef={resultsHeadingRef} />
      ) : (
        <section className="empty-state" data-testid="jd-empty-state">
          <FileSearch size={28} aria-hidden="true" />
          <h2>Ready to check a resume against a job description</h2>
          <p>
            Add the resume on the left and the job description on the right. Each requirement is classified as a match, partial,
            transferable, hidden match, gap, or claim risk, with the resume evidence that supports it. There is no percentage score.
          </p>
        </section>
      )}
    </div>
  )
}

function InputPanel({
  side,
  title,
  state,
  onSource,
  onFile,
  onText,
}: {
  side: Side
  title: string
  state: SideState
  onSource: (source: SourceMode) => void
  onFile: (files: FileList | null) => void
  onText: (text: string) => void
}) {
  const textareaId = useId()
  return (
    <div className="jd-input" data-testid={`${side}-input`}>
      <div className="jd-input-head">
        <h2>{title}</h2>
        <div className="source-toggle" role="group" aria-label={`${title} source`}>
          {(['upload', 'paste'] as SourceMode[]).map((source) => (
            <button
              key={source}
              type="button"
              className={state.source === source ? 'source-option active' : 'source-option'}
              aria-pressed={state.source === source}
              onClick={() => onSource(source)}
              data-testid={`${side}-source-${source}`}
            >
              {source === 'upload' ? 'Upload file' : 'Paste text'}
            </button>
          ))}
        </div>
      </div>
      {state.source === 'upload' ? (
        <FilePicker label={title} file={state.file} onChange={onFile} testId={`${side}-upload`} hint="Word (.docx) or text-based PDF" />
      ) : (
        <div className="paste-field">
          <label htmlFor={textareaId}>Paste {title.toLowerCase()} text</label>
          <textarea
            id={textareaId}
            value={state.text}
            onChange={(event) => onText(event.currentTarget.value)}
            placeholder={side === 'resume' ? 'Paste the full resume, including experience bullets.' : 'Paste the responsibilities and requirements sections.'}
            rows={12}
            spellCheck={false}
            data-testid={`${side}-paste`}
          />
          <small>{state.text.length.toLocaleString('en-US')} characters</small>
        </div>
      )}
    </div>
  )
}

function JDResults({ result, headingRef }: { result: JDDiffResult; headingRef: RefObject<HTMLHeadingElement | null> }) {
  const [filter, setFilter] = useState<FilterId>('all')
  const active = FILTERS.find((item) => item.id === filter) ?? FILTERS[0]
  const visible = active.statuses ? result.matches.filter((match) => active.statuses!.includes(match.status)) : result.matches
  const countFor = (statuses: MatchStatus[] | null) =>
    statuses ? statuses.reduce((sum, status) => sum + result.summary[status], 0) : result.summary.total

  return (
    <section className="results jd-results" aria-labelledby="jd-results-heading">
      <div className="result-header jd-result-header">
        <div>
          <h2 id="jd-results-heading" ref={headingRef} tabIndex={-1} data-testid="jd-results-heading">
            Evidence matrix: {result.summary.total} requirement{result.summary.total === 1 ? '' : 's'}
          </h2>
          <p data-testid="jd-sources">
            {result.resumeSource.name} ({labelForKind(result.resumeSource.kind)}) vs {result.jdSource.name} ({labelForKind(result.jdSource.kind)})
          </p>
        </div>
        <ul className="jd-summary" data-testid="jd-summary" aria-label="Summary counts">
          {SUMMARY_ORDER.map((status) => {
            const count = result.summary[status]
            const Icon = STATUS_META[status].icon
            return (
              <li key={status} className={`jd-count status-${statusSlug(status)}`} data-testid={`jd-count-${status}`}>
                <Icon size={16} aria-hidden="true" />
                <strong>{count}</strong> {STATUS_META[status].countLabel[count === 1 ? 0 : 1]}
              </li>
            )
          })}
        </ul>
      </div>

      {result.warnings.length > 0 && (
        <ul className="jd-warnings" data-testid="jd-warnings">
          {result.warnings.map((warning) => (
            <li key={warning}>
              <TriangleAlert size={16} aria-hidden="true" />
              {warning}
            </li>
          ))}
        </ul>
      )}

      <div className="risk-filters jd-filters" role="group" aria-label="Filter requirements by status" data-testid="jd-filters">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`filter-btn${filter === item.id ? ' active' : ''}`}
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
            data-testid={`jd-filter-${item.id}`}
          >
            {item.label} ({countFor(item.statuses)})
          </button>
        ))}
      </div>

      <p className="muted jd-visible-count" role="status" data-testid="jd-visible-count">
        Showing {visible.length} of {result.matches.length} requirements in job-description order.
      </p>

      <div className="jd-matrix-wrap">
        <table className="jd-matrix" data-testid="jd-matrix">
          <caption className="sr-only">Job description requirements compared with resume evidence</caption>
          <thead>
            <tr>
              <th scope="col">JD requirement</th>
              <th scope="col">Resume evidence</th>
              <th scope="col">Status</th>
              <th scope="col">Reason</th>
              <th scope="col">Suggested action</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="jd-empty-row" data-testid="jd-empty-filter">
                  {result.matches.length === 0 ? 'No requirements were extracted from this job description.' : 'No requirements have this status.'}
                </td>
              </tr>
            ) : (
              visible.map((match) => <MatrixRow key={match.requirement.id} match={match} />)
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function MatrixRow({ match }: { match: EvidenceMatch }) {
  const { requirement } = match
  const showSource = requirement.sourceText && requirement.sourceText !== requirement.originalText
  return (
    <tr className={`jd-row status-${statusSlug(match.status)}`} data-testid="jd-row" data-status={match.status} data-concept={requirement.normalizedConcept ?? ''}>
      <td data-label="JD requirement">
        <strong className="jd-requirement" data-testid="jd-requirement">{requirement.originalText}</strong>
        <span className="jd-meta">
          {IMPORTANCE_LABELS[requirement.importance]}
          {requirement.sourceSection ? ` - ${requirement.sourceSection}` : ''}
          {requirement.occurrences && requirement.occurrences > 1 ? ` - mentioned ${requirement.occurrences} times` : ''}
        </span>
        {showSource && <span className="jd-source-text">"{requirement.sourceText}"</span>}
      </td>
      <td data-label="Resume evidence">
        {match.evidence.length === 0 ? (
          <span className="muted">No supporting evidence</span>
        ) : (
          <ul className="jd-evidence">
            {match.evidence.map((item) => (
              <li key={item.id} data-testid="jd-evidence">
                <q>{item.originalText}</q>
                <span className="jd-meta">
                  {[item.sourceSection, item.employerOrProject, item.lineNumber ? `line ${item.lineNumber}` : undefined].filter(Boolean).join(' - ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </td>
      <td data-label="Status">
        <StatusBadge status={match.status} />
      </td>
      <td data-label="Reason" className="jd-reason">{match.reason}</td>
      <td data-label="Suggested action">
        <span className="jd-action" data-testid="action-label">{ACTION_LABELS[match.action]}</span>
      </td>
    </tr>
  )
}

function StatusBadge({ status }: { status: MatchStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span className={`jd-status status-${statusSlug(status)}`} data-testid="status-label">
      <Icon size={15} aria-hidden="true" />
      {meta.label}
    </span>
  )
}

function statusSlug(status: MatchStatus): string {
  return status.toLowerCase().replace('_', '-')
}

function activeInput(state: SideState): JDDiffInput {
  return state.source === 'upload' ? { file: state.file, text: '' } : { file: null, text: state.text }
}

function hasInput(input: JDDiffInput): boolean {
  return Boolean(input.file) || input.text.trim().length > 0
}

function describeInput(label: string, state: SideState): string {
  if (state.source === 'upload') return state.file ? `${label}: ${state.file.name}` : `${label}: no file yet`
  return state.text.trim() ? `${label}: pasted text` : `${label}: nothing pasted yet`
}

function labelForKind(kind: JDDiffResult['resumeSource']['kind']): string {
  return kind === 'paste' ? 'pasted' : kind.toUpperCase()
}
