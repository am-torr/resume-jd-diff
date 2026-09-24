import { expect, test } from '@playwright/test'
import path from 'node:path'
import { FIXTURE_EXPECTED, FIXTURE_JD, FIXTURE_RESUME } from '../tests/fixtures/jdDiffFixture'

const fixtureDir = path.resolve('fixtures/generated')
const STATUS_TEXT: Record<string, string> = {
  MATCH: 'MATCH',
  PARTIAL: 'PARTIAL',
  TRANSFERABLE: 'TRANSFERABLE',
  HIDDEN_MATCH: 'HIDDEN MATCH',
  GAP: 'GAP',
  CLAIM_RISK: 'CLAIM RISK',
}

test.describe('JD Diff mode', () => {
  test('classifies the section-18 fixture as an evidence matrix with text status labels and count summary', async ({ page }, testInfo) => {
    await page.goto('/')
    await expect(page.getByTestId('empty-state')).toBeVisible()
    await page.getByTestId('mode-jd-diff').click()
    await expect(page.getByTestId('mode-jd-diff')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: 'Resume', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Job Description', exact: true })).toBeVisible()

    await page.getByTestId('resume-source-paste').click()
    await page.getByTestId('resume-paste').fill(FIXTURE_RESUME)
    await page.getByTestId('jd-paste').fill(FIXTURE_JD)
    await page.getByTestId('jd-compare-button').click()

    const matrix = page.getByTestId('jd-matrix')
    await expect(matrix).toBeVisible()
    await expect(matrix.getByRole('columnheader')).toHaveText(['JD requirement', 'Resume evidence', 'Status', 'Reason', 'Suggested action'])
    await expect(page.getByTestId('jd-results-heading')).toBeFocused()

    for (const [concept, allowed] of Object.entries(FIXTURE_EXPECTED)) {
      const label = page.locator(`[data-testid="jd-row"][data-concept="${concept}"] [data-testid="status-label"]`)
      await expect(label).toHaveCount(1)
      expect(allowed.map((status) => STATUS_TEXT[status])).toContain((await label.innerText()).trim())
    }

    const rows = page.getByTestId('jd-row')
    const total = await rows.count()
    expect(total).toBeGreaterThan(10)
    await expect(page.getByTestId('status-label')).toHaveCount(total)
    for (const text of await page.getByTestId('status-label').allInnerTexts()) {
      expect(Object.values(STATUS_TEXT)).toContain(text.trim())
    }

    await expect(page.getByTestId('jd-summary')).toContainText('direct matches')
    await expect(page.getByTestId('jd-summary')).toContainText('genuine gaps')
    const pageText = await page.locator('main').innerText()
    expect(pageText).not.toMatch(/%/)
    expect(pageText).not.toMatch(/\bATS\b|match score/i)

    for (const filter of ['all', 'matches', 'partial', 'transferable', 'hidden', 'gaps', 'risks']) {
      await expect(page.getByTestId(`jd-filter-${filter}`)).toBeVisible()
    }
    await page.getByTestId('jd-filter-gaps').click()
    await expect(page.getByTestId('jd-filter-gaps')).toHaveAttribute('aria-pressed', 'true')
    const gapStatuses = await page.getByTestId('jd-row').evaluateAll((elements) => elements.map((element) => element.getAttribute('data-status')))
    expect(gapStatuses.length).toBeGreaterThan(0)
    expect(new Set(gapStatuses)).toEqual(new Set(['GAP']))
    await page.getByTestId('jd-filter-all').click()
    await expect(page.getByTestId('jd-row')).toHaveCount(total)

    await page.screenshot({ path: testInfo.outputPath('jd-diff-fixture.png'), fullPage: true })
  })

  test('reuses the existing upload and parse flow for a .docx resume', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('mode-jd-diff').click()
    await page.getByTestId('resume-upload').setInputFiles(path.join(fixtureDir, 'chronological-original.docx'))
    await page.getByTestId('jd-paste').fill('Requirements\n- TypeScript\n- Terraform\n- Kafka')
    await page.getByTestId('jd-compare-button').click()

    await expect(page.getByTestId('jd-matrix')).toBeVisible()
    await expect(page.getByTestId('jd-sources')).toContainText('DOCX')
    await expect(page.getByTestId('jd-row')).toHaveCount(3)
  })

  test('rejects unsupported files and missing input without calling the API', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('mode-jd-diff').click()
    await page.getByTestId('jd-compare-button').click()
    await expect(page.getByTestId('jd-error-banner')).toContainText('Provide both a resume and a job description')

    await page.getByTestId('resume-upload').setInputFiles({ name: 'resume.txt', mimeType: 'text/plain', buffer: Buffer.from('plain text') })
    await expect(page.getByTestId('jd-error-banner')).toContainText('V1 supports .docx and text-based .pdf files only.')
  })

  test('switching back to Resume Diff restores the original flow', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('mode-jd-diff').click()
    await expect(page.getByTestId('empty-state')).toHaveCount(0)
    await page.getByTestId('mode-resume-diff').click()
    await expect(page.getByTestId('empty-state')).toBeVisible()
    await expect(page.getByTestId('jd-diff-workspace')).toBeHidden()
    await expect(page.getByTestId('original-upload')).toHaveCount(1)
  })

  test('renders a dark color scheme when the OS prefers dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await page.getByTestId('mode-jd-diff').click()
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(background).toBe('rgb(15, 21, 18)')
  })
})
