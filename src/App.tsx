import { AlertTriangle, CheckCircle2, ClipboardCopy, Download, FileSearch, FileText, RefreshCw, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import './App.css'
import { compareFiles, isSupportedFile } from './api'
import { FilePicker } from './FilePicker'
import { JDDiffWorkspace } from './JDDiff'
import { downloadHtmlReport } from './report'
import type { CompareResult, DiffPart, ExtractionConfidence, ExtractedDocument, QualityStatus, RiskCategory, SectionDiff } from './types'

function joinWrappedLines(text: string): string {
  // Collapse single-newline PDF row-boundary breaks into spaces, but preserve
  // newlines before list markers (-, •, digits) and paragraph gaps (\n\n).
  return text
    .replace(/\n([^-•\n\d])/g, ' $1')
    .replace(/\n{3,}/g, '\n\n')
}

type Slot = 'original' | 'revised'
type Mode = 'resume' | 'jd'
type ActiveTab = 'summary' | 'sections' | 'diff' | 'risks' | 'export' | 'text'
type RiskFilter = 'all' | 'critical' | 'warning' | 'info'

const tabs: Array<{ id: ActiveTab; label: string }> = [
  { id: 'summary', label: 'Summary' },
  { id: 'sections', label: 'Section Diff' },
  { id: 'diff', label: 'Full Diff' },
  { id: 'risks', label: 'Risk Checks' },
  { id: 'export', label: 'Export' },
  { id: 'text', label: 'Extracted Text' },
]

const STATUS_ORDER: Record<SectionDiff['status'], number> = {
  changed: 0,
  added: 1,
  removed: 2,
  unchanged: 3,
}

function App() {
  const [mode, setMode] = useState<Mode>('resume')
  const [original, setOriginal] = useState<File | null>(null)
  const [revised, setRevised] = useState<File | null>(null)
  const [result, setResult] = useState<CompareResult | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary')
  const [error, setError] = useState('')
  const [isComparing, setIsComparing] = useState(false)

  const pairing = useMemo(() => {
    if (!original || !revised) return 'Choose a .docx or text-based .pdf on each side'
    return `${fileKind(original)} -> ${fileKind(revised)}`
  }, [original, revised])

  async function runCompare() {
    if (!original || !revised) {
      setError('Choose both an original and revised resume.')
      return
    }
    if (!isSupportedFile(original) || !isSupportedFile(revised)) {
      setError('V1 supports .docx and text-based .pdf files only.')
      return
    }

    setError('')
    setIsComparing(true)
    try {
      const comparison = await compareFiles(original, revised)
      setResult(comparison)
      setActiveTab('summary')
    } catch (comparisonError) {
      setResult(null)
      setError(comparisonError instanceof Error ? comparisonError.message : 'Unable to compare these files.')
    } finally {
      setIsComparing(false)
    }
  }

  function handleFile(slot: Slot, files: FileList | null) {
    const file = files?.[0] ?? null
    if (file && !isSupportedFile(file)) {
      setError('V1 supports .docx and text-based .pdf files only.')
      return
    }
    setError('')
    setResult(null)
    if (slot === 'original') {
      setOriginal(file)
    } else {
      setRevised(file)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{mode === 'resume' ? 'Local Resume Diff Viewer' : 'Local JD Diff'}</p>
          <h1>
            {mode === 'resume'
              ? 'Compare resume text without uploading it anywhere.'
              : 'Check a resume against a job description, evidence first.'}
          </h1>
        </div>
        <div className="privacy-badge">
          <ShieldCheck size={18} aria-hidden="true" />
          Local only
        </div>
      </header>

      <div className="mode-switch" role="group" aria-label="Comparison mode">
        <button
          type="button"
          className={mode === 'resume' ? 'mode-option active' : 'mode-option'}
          aria-pressed={mode === 'resume'}
          onClick={() => setMode('resume')}
          data-testid="mode-resume-diff"
        >
          <FileText size={16} aria-hidden="true" />
          Resume Diff
        </button>
        <button
          type="button"
          className={mode === 'jd' ? 'mode-option active' : 'mode-option'}
          aria-pressed={mode === 'jd'}
          onClick={() => setMode('jd')}
          data-testid="mode-jd-diff"
        >
          <FileSearch size={16} aria-hidden="true" />
          JD Diff
        </button>
      </div>

      <JDDiffWorkspace hidden={mode !== 'jd'} />

      {mode === 'resume' && (
      <>
      <section className="workspace">
        <div className="upload-grid">
          <FilePicker
            label="Original"
            testId="original-upload"
            file={original}
            onChange={(files) => handleFile('original', files)}
          />
          <FilePicker
            label="Revised"
            testId="revised-upload"
            file={revised}
            onChange={(files) => handleFile('revised', files)}
          />
        </div>

        <div className="compare-strip">
          <div>
            <span className="pairing" data-testid="pairing-label">{pairing}</span>
            <p>.docx and text-based .pdf are supported in V1. Scanned PDFs need OCR later.</p>
          </div>
          <button className="primary-action" type="button" onClick={runCompare} disabled={isComparing} data-testid="compare-button">
            {isComparing ? <RefreshCw className="spin" size={18} /> : <FileText size={18} />}
            {isComparing ? 'Comparing' : 'Compare'}
          </button>
        </div>

        {error && <div className="error-banner" data-testid="error-banner">{error}</div>}
      </section>

      {result ? (
        <section className="results">
          <ResultHeader result={result} />

          <div className="tabs" role="tablist" aria-label="Comparison views">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'tab active' : 'tab'}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
              </button>
            ))}
            <button className="export-button" type="button" onClick={() => downloadHtmlReport(result)} data-testid="export-html-button">
              <Download size={16} />
              Export HTML
            </button>
          </div>

          {activeTab === 'summary' && <SummaryView result={result} />}
          {activeTab === 'sections' && <SectionView sections={result.sectionDiffs} />}
          {activeTab === 'diff' && <DiffView result={result} />}
          {activeTab === 'risks' && <RiskView result={result} />}
          {activeTab === 'export' && <ExportView result={result} />}
          {activeTab === 'text' && <TextView original={result.original} revised={result.revised} />}
        </section>
      ) : (
        <section className="empty-state" data-testid="empty-state">
          <FileText size={28} />
          <h2>Ready for the first comparison</h2>
          <p>Drop in a Word or PDF version on each side. The app will normalize text, detect sections, map heading synonyms, and flag resume-specific risks.</p>
        </section>
      )}
      </>
      )}
    </main>
  )
}

function ResultHeader({ result }: { result: CompareResult }) {
  return (
    <div className="result-header">
      <div>
        <span className={`status ${statusClass(result.summary.status)}`}>{result.summary.status}</span>
        <h2 data-testid="comparison-status">{result.summary.headline}</h2>
        <p>
          <span data-testid="result-pairing">{result.pairing}</span> · {result.summary.changedSections} changed section(s) · {result.summary.riskCount} review item(s)
        </p>
      </div>
      <div className="metric-row">
        <Metric label="Inserted" value={`+${result.diff.insertedWords}`} />
        <Metric label="Deleted" value={`-${result.diff.deletedWords}`} />
        <Metric label="Unchanged" value={String(result.diff.unchangedWords)} />
      </div>
    </div>
  )
}

function CriticalChangesPanel({ result }: { result: CompareResult }) {
  const critical = result.risks.filter((r) => r.severity === 'critical')
  if (critical.length === 0) return null
  return (
    <div className="critical-banner" data-testid="critical-banner">
      <strong>Critical Changes</strong>
      {critical.map((risk, i) => (
        <div key={`${risk.title}-${i}`} className="critical-row">
          <AlertTriangle size={15} />
          <span><strong>{risk.title}:</strong> {risk.detail}</span>
        </div>
      ))}
    </div>
  )
}

function groupByCategory(risks: CompareResult['risks']): Array<[RiskCategory, CompareResult['risks']]> {
  const map = new Map<RiskCategory, CompareResult['risks']>()
  for (const r of risks) {
    map.set(r.category, [...(map.get(r.category) ?? []), r])
  }
  return [...map.entries()]
}

function RiskList({ risks }: { risks: CompareResult['risks'] }) {
  if (risks.length === 0) {
    return (
      <div className="clean-line">
        <CheckCircle2 size={18} />
        No risk warnings found.
      </div>
    )
  }
  const groups = groupByCategory(risks)
  return (
    <>
      {groups.map(([category, items]) => (
        <div key={category} className="risk-category-group">
          <p className="risk-category-label">{category}</p>
          {items.map((risk, i) => (
            <div key={`${risk.title}-${i}`} className={`risk ${risk.severity}`} data-testid="risk-row">
              <AlertTriangle size={17} />
              <div>
                <strong>{risk.title}</strong>
                <p>{risk.detail}</p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  )
}

function SummaryView({ result }: { result: CompareResult }) {
  return (
    <div className="summary-grid">
      <CriticalChangesPanel result={result} />

      <Panel title="Resume Format">
        <FormatSummary label="Original" document={result.original} />
        <FormatSummary label="Revised" document={result.revised} />
      </Panel>

      <Panel title="Risk Checks">
        <div className="risk-list">
          <RiskList risks={result.risks} />
        </div>
      </Panel>

      <Panel title="Heading Synonyms">
        <HeadingMappings document={result.original} label="Original" />
        <HeadingMappings document={result.revised} label="Revised" />
      </Panel>
    </div>
  )
}

function FormatSummary({ label, document }: { label: string; document: ExtractedDocument }) {
  return (
    <div className="format-summary">
      <div>
        <strong>{label}</strong>
        <p>{document.analysis.formatType}</p>
      </div>
      <div className="format-badges">
        <span className={`status small ${statusClass(document.analysis.quality)}`}>{document.analysis.quality}</span>
        <span className={`confidence-badge confidence-${confidenceClass(document.extractionConfidence)}`} data-testid="confidence-badge">
          {document.extractionConfidence}
        </span>
      </div>
    </div>
  )
}

function HeadingMappings({ document, label }: { document: ExtractedDocument; label: string }) {
  return (
    <div className="mapping-group">
      <h3>{label}</h3>
      {document.analysis.headingMappings.length === 0 ? (
        <p className="muted">No confident section headings detected.</p>
      ) : (
        document.analysis.headingMappings.map((mapping) => (
          <div key={`${label}-${mapping.heading}-${mapping.canonical}`} className="mapping-line">
            <span>{mapping.heading}</span>
            <strong>{mapping.canonical}</strong>
          </div>
        ))
      )}
    </div>
  )
}

function SectionView({ sections }: { sections: SectionDiff[] }) {
  const sorted = [...sections].sort((a, b) => {
    const orderDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (orderDiff !== 0) return orderDiff
    return (b.insertedWords + b.deletedWords) - (a.insertedWords + a.deletedWords)
  })
  return (
    <div className="section-list">
      {sorted.map((section) => (
        <details key={section.section} className="section-diff" open={section.status !== 'unchanged'} data-testid="section-diff-row">
          <summary>
            <span>{section.section}</span>
            <strong className={`section-status ${section.status}`}>{section.status}</strong>
            <small>+{section.insertedWords} / -{section.deletedWords}</small>
          </summary>
          {section.changedHighlights.length > 0 && (
            <div className="changed-highlights" data-testid="changed-highlights">
              {section.changedHighlights.map((line, i) => (
                <p key={i} className="highlight-line">{line}</p>
              ))}
            </div>
          )}
          <div className="two-column-text">
            <div className="section-text">{joinWrappedLines(section.originalText) || 'No original section text detected.'}</div>
            <div className="section-text">{joinWrappedLines(section.revisedText) || 'No revised section text detected.'}</div>
          </div>
        </details>
      ))}
    </div>
  )
}

function DiffView({ result }: { result: CompareResult }) {
  const critical = result.risks.filter((r) => r.severity === 'critical')
  return (
    <div>
      {critical.length > 0 && (
        <div className="critical-banner diff-critical" data-testid="diff-critical-banner">
          <strong>Critical Changes</strong>
          {critical.map((risk, i) => (
            <div key={`${risk.title}-${i}`} className="critical-row">
              <AlertTriangle size={15} />
              <span><strong>{risk.title}:</strong> {risk.detail}</span>
            </div>
          ))}
        </div>
      )}
      {result.summary.isNoChange ? (
        <div className="no-change-notice" data-testid="no-change-notice">
          <CheckCircle2 size={18} />
          No text changes detected between these documents.
        </div>
      ) : (
        <div className="diff-pane">
          {result.diff.parts.map((part: DiffPart, index: number) => (
            <span
              key={`${part.value}-${index}`}
              className={part.added ? 'inserted' : part.removed ? 'deleted' : undefined}
              data-testid={part.added ? 'diff-inserted' : part.removed ? 'diff-deleted' : 'diff-unchanged'}
            >
              {part.value}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function RiskView({ result }: { result: CompareResult }) {
  const [filter, setFilter] = useState<RiskFilter>('all')
  const filtered = filter === 'all' ? result.risks : result.risks.filter((r) => r.severity === filter)
  const countFor = (level: Exclude<RiskFilter, 'all'>) => result.risks.filter((r) => r.severity === level).length

  return (
    <Panel title="Risk Checks">
      <div className="risk-filters" data-testid="risk-filters">
        {(['all', 'critical', 'warning', 'info'] as RiskFilter[]).map((level) => (
          <button
            key={level}
            type="button"
            className={`filter-btn${filter === level ? ' active' : ''}`}
            onClick={() => setFilter(level)}
            data-testid={`filter-${level}`}
          >
            {level === 'all'
              ? `All (${result.risks.length})`
              : `${level.charAt(0).toUpperCase() + level.slice(1)} (${countFor(level)})`}
          </button>
        ))}
      </div>
      <div className="risk-list">
        <RiskList risks={filtered} />
      </div>
    </Panel>
  )
}

function ExportView({ result }: { result: CompareResult }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await copySummary(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Panel title="Export">
      <p className="muted">Save a local HTML report with the summary, section diffs, full diff metrics, and risk checks.</p>
      <button className="primary-action" type="button" onClick={() => downloadHtmlReport(result)} data-testid="export-panel-html-button">
        <Download size={16} />
        Export HTML
      </button>
      <p className="muted" style={{ marginTop: '16px' }}>Copy a plain-text summary to paste into notes or email.</p>
      <button className="copy-btn" type="button" onClick={handleCopy} data-testid="copy-summary-button">
        <ClipboardCopy size={16} />
        {copied ? 'Copied!' : 'Copy Summary'}
      </button>
    </Panel>
  )
}

function TextView({ original, revised }: { original: ExtractedDocument; revised: ExtractedDocument }) {
  return (
    <div className="two-column-text tall">
      <pre>{original.normalizedText}</pre>
      <pre>{revised.normalizedText}</pre>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="panel">
      <h2>{title}</h2>
      {children}
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

async function copySummary(result: CompareResult): Promise<void> {
  const actionable = result.risks.filter((r) => r.severity !== 'info')
  const lines = [
    `Resume Diff — ${result.summary.status}`,
    result.summary.headline,
    `${result.pairing} · ${new Date(result.comparedAt).toLocaleDateString()}`,
    `+${result.diff.insertedWords} / -${result.diff.deletedWords} words · ${result.summary.changedSections} section(s) changed`,
    '',
    ...actionable.map((r) => `${r.severity === 'critical' ? '⚠' : '•'} [${r.category}] ${r.title}: ${r.detail}`),
  ]
  await navigator.clipboard.writeText(lines.join('\n'))
}

function fileKind(file: File): string {
  return file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOCX'
}

function statusClass(status: QualityStatus): string {
  if (status === 'Pass') return 'pass'
  if (status === 'Warning') return 'warning'
  return 'review'
}

function confidenceClass(confidence: ExtractionConfidence): string {
  if (confidence === 'Good') return 'good'
  if (confidence === 'Needs Review') return 'needs-review'
  return 'problematic'
}

export default App
