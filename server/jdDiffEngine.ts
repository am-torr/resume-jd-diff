/**
 * PUBLIC DEMO ENGINE
 *
 * The production JD Diff engine (requirement extraction, concept aliasing,
 * layered matching and claim-risk rules) is proprietary and is not included
 * in this repository. This stub keeps JD Diff mode runnable with a simple
 * shared-keyword match: every requirement is PARTIAL (keywords shared) or GAP.
 */
import { MATCH_STATUSES } from '../src/types.ts'
import type {
  EvidenceMatch,
  JDDiffAnalysis,
  JDRequirement,
  MatchStatus,
  ResumeEvidence,
} from '../src/types.ts'

const STOP_WORDS = new Set([
  'and', 'the', 'with', 'for', 'from', 'that', 'this', 'will', 'have', 'your', 'you', 'our',
  'are', 'using', 'into', 'about', 'able', 'work', 'team', 'years', 'experience', 'strong',
])

export function compareResumeToJobDescription(resumeText: string, jdText: string): JDDiffAnalysis {
  const requirements: JDRequirement[] = toLines(jdText)
    .slice(0, 50)
    .map((line, index) => ({
      id: `req-${index + 1}`,
      originalText: line,
      category: 'RESPONSIBILITY',
      importance: 'CONTEXT',
      sourceText: line,
    }))

  const evidence: ResumeEvidence[] = toLines(resumeText).map((line, index) => ({
    id: `ev-${index + 1}`,
    originalText: line,
    lineNumber: index + 1,
  }))

  const matches: EvidenceMatch[] = requirements.map((requirement) => {
    const wanted = keywords(requirement.originalText)
    const hits = evidence
      .filter((item) => [...keywords(item.originalText)].some((word) => wanted.has(word)))
      .slice(0, 3)
    const found = hits.length > 0
    return {
      requirement,
      evidence: hits,
      status: found ? 'PARTIAL' : 'GAP',
      reason: found
        ? 'Shared keywords found (public demo engine).'
        : 'No shared keywords found (public demo engine).',
      action: found ? 'STRENGTHEN_WORDING' : 'LEARNING_TARGET',
      matchLayer: found ? 'KEYWORD' : 'NONE',
    }
  })

  const counts = Object.fromEntries(MATCH_STATUSES.map((status) => [status, 0])) as Record<MatchStatus, number>
  for (const match of matches) counts[match.status] += 1

  return {
    requirements,
    evidence,
    matches,
    summary: { ...counts, total: matches.length },
    warnings: ['Public demo engine: matching is simplified to shared keywords.'],
  }
}

function toLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•*\-–]+/, '').trim())
    .filter((line) => line.length >= 3 && line.length <= 300)
}

function keywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word)),
  )
}
