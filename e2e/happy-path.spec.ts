import { expect, test } from '@playwright/test'
import path from 'node:path'

const fixtureDir = path.resolve('fixtures/generated')
const happyPathCases = [
  ['chronological-original.docx', 'chronological-revised.docx', 'DOCX -> DOCX'],
  ['chronological-original.docx', 'chronological-revised.pdf', 'DOCX -> PDF'],
  ['chronological-original.pdf', 'chronological-revised.docx', 'PDF -> DOCX'],
  ['chronological-original.pdf', 'chronological-revised.pdf', 'PDF -> PDF'],
] as const

test.describe('resume diff happy paths', () => {
  for (const [originalName, revisedName, expectedPairing] of happyPathCases) {
    test(`compares ${expectedPairing}`, async ({ page }) => {
      await page.goto('/')
      await expect(page.getByTestId('empty-state')).toBeVisible()

      await page.getByTestId('original-upload').setInputFiles(path.join(fixtureDir, originalName))
      await page.getByTestId('revised-upload').setInputFiles(path.join(fixtureDir, revisedName))
      await expect(page.getByTestId('pairing-label')).toHaveText(expectedPairing)

      await page.getByTestId('compare-button').click()
      await expect(page.getByTestId('comparison-status')).toBeVisible()
      await expect(page.getByTestId('result-pairing')).toHaveText(expectedPairing)
      await expect(page.getByTestId('risk-row').first()).toBeVisible()

      await page.getByTestId('tab-sections').click()
      await expect(page.getByTestId('section-diff-row').first()).toBeVisible()
      await page.getByTestId('tab-diff').click()
      await expect(page.getByTestId('diff-inserted').first()).toBeVisible()
      await page.getByTestId('tab-risks').click()
      await expect(page.getByTestId('risk-row').first()).toBeVisible()
      await page.getByTestId('tab-export').click()
      await expect(page.getByTestId('export-panel-html-button')).toBeVisible()
    })
  }

  test('filters risks by severity when Warning filter is active', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('original-upload').setInputFiles(path.join(fixtureDir, 'chronological-original.docx'))
    await page.getByTestId('revised-upload').setInputFiles(path.join(fixtureDir, 'chronological-revised.docx'))
    await page.getByTestId('compare-button').click()
    await expect(page.getByTestId('comparison-status')).toBeVisible()

    await page.getByTestId('tab-risks').click()
    await expect(page.getByTestId('risk-filters')).toBeVisible()
    await page.getByTestId('filter-warning').click()
    await expect(page.locator('.risk.critical')).toHaveCount(0)
    await expect(page.locator('.risk.info')).toHaveCount(0)
  })

  test('shows no-change notice in Diff tab when both files are identical', async ({ page }) => {
    await page.goto('/')
    const filePath = path.join(fixtureDir, 'chronological-original.docx')
    await page.getByTestId('original-upload').setInputFiles(filePath)
    await page.getByTestId('revised-upload').setInputFiles(filePath)
    await page.getByTestId('compare-button').click()
    await expect(page.getByTestId('comparison-status')).toBeVisible()

    await page.getByTestId('tab-diff').click()
    await expect(page.getByTestId('no-change-notice')).toBeVisible()
  })

  test('shows an unsupported file error before upload to third-party services is involved', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('original-upload').setInputFiles({
      name: 'resume.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('plain text is unsupported in V1'),
    })

    await expect(page.getByTestId('error-banner')).toContainText('V1 supports .docx and text-based .pdf files only.')
  })
})
