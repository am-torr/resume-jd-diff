import type { CompareResult } from './types'

export function downloadHtmlReport(result: CompareResult): void {
  const html = buildHtmlReport(result)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `resume-diff-${new Date().toISOString().slice(0, 10)}.html`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function buildHtmlReport(result: CompareResult): string {
  const risks = result.risks
    .map((risk) => `<li><strong>${escapeHtml(risk.title)}</strong> <span class="pill">${escapeHtml(risk.severity)}</span> <span class="pill">${escapeHtml(risk.category)}</span><br>${escapeHtml(risk.detail)}</li>`)
    .join('')
  const sections = result.sectionDiffs
    .map(
      (section) => `
        <tr>
          <td>${escapeHtml(section.section)}</td>
          <td>${escapeHtml(section.status)}</td>
          <td>+${section.insertedWords}</td>
          <td>-${section.deletedWords}</td>
        </tr>`,
    )
    .join('')
  const fullDiff = result.diff.parts
    .map((part) => {
      const className = part.added ? 'added' : part.removed ? 'removed' : ''
      return `<span class="${className}">${escapeHtml(part.value)}</span>`
    })
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Resume Diff Report</title>
  <style>
    body { color: #17201b; font: 14px/1.55 system-ui, -apple-system, Segoe UI, sans-serif; margin: 32px; }
    h1, h2 { color: #101512; }
    .pill { border: 1px solid #b8c6bd; border-radius: 999px; display: inline-block; padding: 3px 10px; }
    .added { background: #d8f3dc; color: #154522; }
    .removed { background: #ffe0dd; color: #7b1f17; text-decoration: line-through; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border-bottom: 1px solid #d8ddd9; padding: 8px; text-align: left; vertical-align: top; }
    pre { background: #f5f7f5; border: 1px solid #d8ddd9; border-radius: 6px; padding: 16px; white-space: pre-wrap; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <h1>Resume Diff Report</h1>
  <p><span class="pill">${escapeHtml(result.summary.status)}</span> ${escapeHtml(result.summary.headline)}</p>
  <p>${escapeHtml(result.original.fileName)} compared with ${escapeHtml(result.revised.fileName)} on ${escapeHtml(new Date(result.comparedAt).toLocaleString())}</p>

  <h2>Formats</h2>
  <p>Original: ${escapeHtml(result.original.analysis.formatType)} (extraction: ${escapeHtml(result.original.extractionConfidence)}). Revised: ${escapeHtml(result.revised.analysis.formatType)} (extraction: ${escapeHtml(result.revised.extractionConfidence)}).</p>

  <h2>Risks</h2>
  <ul>${risks || '<li>No risk warnings found.</li>'}</ul>

  <h2>Section Summary</h2>
  <table>
    <thead><tr><th>Section</th><th>Status</th><th>Inserted</th><th>Deleted</th></tr></thead>
    <tbody>${sections}</tbody>
  </table>

  <h2>Full Text Diff</h2>
  <pre>${fullDiff}</pre>
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
